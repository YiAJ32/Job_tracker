from datetime import datetime, timedelta, timezone
from uuid import UUID

import string

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models import User

ALGORITHM = "HS256"

PASSWORD_MIN_LENGTH = 12
# bcrypt usa solo los primeros 72 bytes; al permitir solo ASCII, 72 caracteres son 72 bytes
PASSWORD_MAX_LENGTH = 72
PASSWORD_SPECIAL_CHARACTERS = set(string.punctuation)

bearer_scheme = HTTPBearer(auto_error=False)


def validate_new_password(password: str) -> None:
    """Reglas para contraseñas nuevas; las ya guardadas siguen sirviendo para entrar."""
    if not PASSWORD_MIN_LENGTH <= len(password) <= PASSWORD_MAX_LENGTH:
        raise HTTPException(
            status_code=400, detail="La contraseña tiene que tener entre 12 y 72 caracteres"
        )
    # Solo ASCII visible: letras sin tildes, números y signos; nada de espacios ni emojis
    if not all("!" <= c <= "~" for c in password):
        raise HTTPException(
            status_code=400,
            detail="La contraseña no puede tener espacios, tildes, ñ ni emojis",
        )
    if not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="La contraseña tiene que tener al menos un número")
    if not any(c.isupper() for c in password):
        raise HTTPException(
            status_code=400, detail="La contraseña tiene que tener al menos una mayúscula"
        )
    if not any(c in PASSWORD_SPECIAL_CHARACTERS for c in password):
        raise HTTPException(
            status_code=400, detail="La contraseña tiene que tener al menos un signo especial"
        )


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_access_token(user_id: UUID) -> str:
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(
        {"sub": str(user_id), "iat": now, "exp": expires},
        settings.jwt_secret,
        algorithm=ALGORITHM,
    )


def _issued_before_password_change(payload: dict, user: User) -> bool:
    if user.password_actualizada_en is None:
        return False
    return payload.get("iat", 0) < int(user.password_actualizada_en.timestamp())


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Tenés que iniciar sesión")
    try:
        payload = jwt.decode(
            credentials.credentials, settings.jwt_secret, algorithms=[ALGORITHM]
        )
        user = db.get(User, UUID(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        user = None
    if user is None or _issued_before_password_change(payload, user):
        raise HTTPException(status_code=401, detail="Sesión inválida o vencida")
    return user
