import asyncio
import logging
import smtplib
from datetime import datetime, timedelta, timezone

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Company, JobApplication, User

logger = logging.getLogger("uvicorn.error")

# Debe coincidir con el id sembrado en la migración a1d6e3f8c2b9
NO_RESPONSE_STATUS_ID = 7


def send_no_response_reminders(db: Session) -> int:
    """Manda un correo por cada solicitud que lleva más de N días en "Sin respuesta".
    Cada solicitud recibe un solo recordatorio mientras siga en ese estado."""
    # Se importa acá para que los tests puedan reemplazar la función
    from app.services import email

    now = datetime.now(timezone.utc)
    limit = now - timedelta(days=settings.no_response_reminder_days)
    pending = (
        db.query(JobApplication, User, Company)
        .join(User, JobApplication.user_id == User.id)
        .join(Company, JobApplication.company_id == Company.id)
        .filter(
            JobApplication.estado_id == NO_RESPONSE_STATUS_ID,
            JobApplication.estado_actualizado_en < limit,
            JobApplication.recordatorio_enviado_en.is_(None),
            User.email_verificado.is_(True),
        )
        .all()
    )

    sent = 0
    for application, user, company in pending:
        # Se marca antes de mandar para que otro proceso del servidor no lo mande dos veces
        claimed = db.execute(
            update(JobApplication)
            .where(
                JobApplication.id == application.id,
                JobApplication.recordatorio_enviado_en.is_(None),
            )
            .values(recordatorio_enviado_en=now)
            .returning(JobApplication.id)
        ).first()
        db.commit()
        if claimed is None:
            continue

        since = application.estado_actualizado_en
        try:
            email.send_no_response_email(
                user.email,
                user.nombre,
                company.nombre,
                application.puesto,
                since.date(),
                (now - since).days,
                user.idioma or "es",
            )
            sent += 1
        except (smtplib.SMTPException, OSError):
            logger.exception("No se pudo enviar el recordatorio de la solicitud %s", application.id)
            # Se libera la marca para reintentarlo en la próxima revisión
            db.execute(
                update(JobApplication)
                .where(JobApplication.id == application.id)
                .values(recordatorio_enviado_en=None)
            )
            db.commit()

    if sent:
        logger.info("Se enviaron %s recordatorios de solicitudes sin respuesta", sent)
    return sent


def _run_once() -> None:
    with SessionLocal() as db:
        send_no_response_reminders(db)


async def reminder_loop() -> None:
    """Revisa periódicamente mientras el servidor está encendido."""
    while True:
        try:
            await asyncio.to_thread(_run_once)
        except Exception:
            logger.exception("Falló la revisión de recordatorios")
        await asyncio.sleep(settings.reminder_check_minutes * 60)


if __name__ == "__main__":
    # Permite revisar sin tener el servidor encendido: python -m app.services.reminders
    logging.basicConfig(level=logging.INFO)
    _run_once()
