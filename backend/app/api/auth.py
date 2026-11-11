import logging
import secrets
import smtplib
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.i18n import preferred_language
from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    validate_new_password,
    verify_password,
)
from app.db.session import get_db
from app.models import User
from app.schemas import (
    AuthResponse,
    EmailOnly,
    EmailVerify,
    PasswordReset,
    RegisterResponse,
    UserLogin,
    UserRead,
    UserRegister,
)
from app.services.accounts import purge_unverified_users
from app.services.email import send_code_email

router = APIRouter(prefix="/api/auth", tags=["auth"])

logger = logging.getLogger("uvicorn.error")

MAX_CODE_ATTEMPTS = 5
RESEND_COOLDOWN = timedelta(minutes=1)
# Pedir un código nuevo reinicia los intentos, así que también se limitan los códigos por hora.
# Con 6 dígitos quedan 25 intentos por hora contra 1.000.000 de combinaciones.
CODE_DIGITS = 6
MAX_CODES_PER_WINDOW = 5
CODE_WINDOW = timedelta(hours=1)
TOO_MANY_CODES = "Pediste demasiados códigos, probá de nuevo en una hora"


class _CodeLimitReached(Exception):
    pass

# Cada tipo de código ("verificacion" o "reset") usa sus propias columnas codigo_<tipo>_*


def _find_user(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email.strip().lower()).first()


def _start_session(user: User) -> AuthResponse:
    user.ultimo_login = datetime.now(timezone.utc)
    return AuthResponse(
        token=create_access_token(user.id), user=UserRead.model_validate(user)
    )


def _code_sent_recently(user: User, kind: str) -> bool:
    expires = getattr(user, f"codigo_{kind}_expira")
    if expires is None:
        return False
    sent_at = expires - timedelta(minutes=settings.verification_code_minutes)
    return datetime.now(timezone.utc) - sent_at < RESEND_COOLDOWN


def _reserve_code_slot(user: User, kind: str) -> None:
    """Cuenta el envío dentro de la ventana de una hora; falla si ya se llegó al máximo."""
    now = datetime.now(timezone.utc)
    window_start = getattr(user, f"codigo_{kind}_envios_desde")
    if window_start is None or now - window_start >= CODE_WINDOW:
        setattr(user, f"codigo_{kind}_envios_desde", now)
        setattr(user, f"codigo_{kind}_envios", 0)
    sent = getattr(user, f"codigo_{kind}_envios") or 0
    if sent >= MAX_CODES_PER_WINDOW:
        raise _CodeLimitReached()
    setattr(user, f"codigo_{kind}_envios", sent + 1)


def _send_new_code(user: User, kind: str, language: str) -> None:
    try:
        _reserve_code_slot(user, kind)
    except _CodeLimitReached:
        raise HTTPException(status_code=429, detail=TOO_MANY_CODES)
    code = f"{secrets.randbelow(10**CODE_DIGITS):0{CODE_DIGITS}d}"
    setattr(user, f"codigo_{kind}_hash", hash_password(code))
    setattr(
        user,
        f"codigo_{kind}_expira",
        datetime.now(timezone.utc) + timedelta(minutes=settings.verification_code_minutes),
    )
    setattr(user, f"codigo_{kind}_intentos", 0)
    # Se envía antes del commit: si el correo falla, no queda guardado un código que nadie recibió
    try:
        send_code_email(user.email, user.nombre, code, language, kind)
    except (smtplib.SMTPException, OSError):
        logger.exception("No se pudo enviar el código de %s a %s", kind, user.email)
        raise HTTPException(
            status_code=502, detail="No pudimos enviar el correo, probá de nuevo en unos minutos"
        )


def _check_code(db: Session, user: User, kind: str, code: str) -> None:
    code_hash = getattr(user, f"codigo_{kind}_hash")
    expires = getattr(user, f"codigo_{kind}_expira")
    attempts = getattr(user, f"codigo_{kind}_intentos")
    if code_hash is None or expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="El código venció, pedí uno nuevo")
    if attempts >= MAX_CODE_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Demasiados intentos, pedí un código nuevo")
    if not verify_password(code, code_hash):
        setattr(user, f"codigo_{kind}_intentos", attempts + 1)
        db.commit()
        raise HTTPException(status_code=400, detail="Código incorrecto")


def _clear_code(user: User, kind: str) -> None:
    setattr(user, f"codigo_{kind}_hash", None)
    setattr(user, f"codigo_{kind}_expira", None)
    setattr(user, f"codigo_{kind}_intentos", 0)


@router.post("/register", response_model=RegisterResponse, status_code=201)
def register(
    payload: UserRegister,
    accept_language: str | None = Header(None),
    db: Session = Depends(get_db),
):
    validate_new_password(payload.password)
    purge_unverified_users(db)
    email = payload.email.strip().lower()
    user = _find_user(db, email)
    if user is not None and user.email_verificado:
        raise HTTPException(status_code=409, detail="Ya existe una cuenta con ese email")

    # Si la cuenta existe sin confirmar, se toman los datos nuevos y se manda otro código
    if user is None:
        user = User(email=email)
        db.add(user)
    user.nombre = payload.nombre.strip()
    user.password_hash = hash_password(payload.password)
    if not _code_sent_recently(user, "verificacion"):
        _send_new_code(user, "verificacion", preferred_language(accept_language))
    db.commit()
    return RegisterResponse(email=email)


@router.post("/verify", response_model=AuthResponse)
def verify_email(payload: EmailVerify, db: Session = Depends(get_db)):
    user = _find_user(db, payload.email)
    if user is None:
        raise HTTPException(status_code=400, detail="Código incorrecto")
    if user.email_verificado:
        raise HTTPException(status_code=400, detail="Este email ya está confirmado")
    _check_code(db, user, "verificacion", payload.codigo)

    user.email_verificado = True
    _clear_code(user, "verificacion")
    response = _start_session(user)
    db.commit()
    return response


@router.post("/resend-code", status_code=204)
def resend_code(
    payload: EmailOnly,
    accept_language: str | None = Header(None),
    db: Session = Depends(get_db),
):
    user = _find_user(db, payload.email)
    # No se avisa si el email no existe o ya está confirmado
    if user is None or user.email_verificado:
        return None
    if _code_sent_recently(user, "verificacion"):
        raise HTTPException(status_code=429, detail="Esperá un minuto antes de pedir otro código")
    _send_new_code(user, "verificacion", preferred_language(accept_language))
    db.commit()
    return None


@router.post("/forgot-password", status_code=204)
def forgot_password(
    payload: EmailOnly,
    accept_language: str | None = Header(None),
    db: Session = Depends(get_db),
):
    user = _find_user(db, payload.email)
    # Siempre responde 204, para no revelar qué emails tienen cuenta: si hay que esperar
    # o se llegó al máximo de códigos, simplemente no se manda uno nuevo
    if user is None or _code_sent_recently(user, "reset"):
        return None
    try:
        _send_new_code(user, "reset", preferred_language(accept_language))
    except HTTPException as exc:
        if exc.status_code != 429:
            raise
        return None
    db.commit()
    return None


@router.post("/reset-password", response_model=AuthResponse)
def reset_password(payload: PasswordReset, db: Session = Depends(get_db)):
    validate_new_password(payload.password)
    user = _find_user(db, payload.email)
    if user is None:
        raise HTTPException(status_code=400, detail="Código incorrecto")
    _check_code(db, user, "reset", payload.codigo)

    user.password_hash = hash_password(payload.password)
    # Cierra las sesiones abiertas con la contraseña anterior
    user.password_actualizada_en = datetime.now(timezone.utc)
    # El código llegó al correo, así que el email también queda confirmado
    user.email_verificado = True
    _clear_code(user, "reset")
    _clear_code(user, "verificacion")
    response = _start_session(user)
    db.commit()
    return response


@router.post("/login", response_model=AuthResponse)
def login(
    payload: UserLogin,
    db: Session = Depends(get_db),
    accept_language: str | None = Header(None),
):
    user = _find_user(db, payload.email)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    if not user.email_verificado:
        raise HTTPException(status_code=403, detail="Tenés que confirmar tu email antes de entrar")
    response = _start_session(user)
    user.idioma = preferred_language(accept_language)
    db.commit()
    return response


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)):
    return user
