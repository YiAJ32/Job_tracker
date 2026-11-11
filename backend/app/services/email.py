import logging
import smtplib
from datetime import date
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

# Textos de cada tipo de código ("verificacion" al registrarse, "reset" para cambiar la contraseña)
CODE_EMAILS = {
    "verificacion": {
        "es": {
            "subject": "Tu código de confirmación: {code}",
            "body": (
                "Hola {nombre},\n\n"
                "Tu código para confirmar la cuenta en Job Tracker es:\n\n"
                "    {code}\n\n"
                "Vence en {minutes} minutos. Si no creaste esta cuenta, ignorá este correo."
            ),
        },
        "en": {
            "subject": "Your confirmation code: {code}",
            "body": (
                "Hi {nombre},\n\n"
                "Your code to confirm your Job Tracker account is:\n\n"
                "    {code}\n\n"
                "It expires in {minutes} minutes. If you didn't create this account, ignore this email."
            ),
        },
        "pt": {
            "subject": "Seu código de confirmação: {code}",
            "body": (
                "Olá {nombre},\n\n"
                "Seu código para confirmar a conta no Job Tracker é:\n\n"
                "    {code}\n\n"
                "Ele expira em {minutes} minutos. Se você não criou esta conta, ignore este email."
            ),
        },
    },
    "reset": {
        "es": {
            "subject": "Tu código para cambiar la contraseña: {code}",
            "body": (
                "Hola {nombre},\n\n"
                "Pediste cambiar la contraseña de tu cuenta en Job Tracker. Tu código es:\n\n"
                "    {code}\n\n"
                "Vence en {minutes} minutos. Si no lo pediste, ignorá este correo: "
                "tu contraseña sigue siendo la misma."
            ),
        },
        "en": {
            "subject": "Your password reset code: {code}",
            "body": (
                "Hi {nombre},\n\n"
                "You asked to change the password of your Job Tracker account. Your code is:\n\n"
                "    {code}\n\n"
                "It expires in {minutes} minutes. If you didn't ask for it, ignore this email: "
                "your password stays the same."
            ),
        },
        "pt": {
            "subject": "Seu código para trocar a senha: {code}",
            "body": (
                "Olá {nombre},\n\n"
                "Você pediu para trocar a senha da sua conta no Job Tracker. Seu código é:\n\n"
                "    {code}\n\n"
                "Ele expira em {minutes} minutos. Se você não pediu, ignore este email: "
                "sua senha continua a mesma."
            ),
        },
    },
}


# Recordatorio de una solicitud que lleva demasiados días en "Sin respuesta"
NO_RESPONSE_EMAILS = {
    "es": {
        "subject": "Tu solicitud en {empresa} lleva {days} días sin respuesta",
        "body": (
            "Hola {nombre},\n\n"
            "Tu solicitud para el puesto de {puesto} en {empresa} está marcada como "
            "\"Sin respuesta\" desde el {desde} (hace {days} días).\n\n"
            "Quizás convenga escribirle a la empresa para hacer un seguimiento, "
            "o actualizar el estado si ya tuviste novedades."
        ),
    },
    "en": {
        "subject": "Your application at {empresa} has had no response for {days} days",
        "body": (
            "Hi {nombre},\n\n"
            "Your application for the {puesto} position at {empresa} has been marked as "
            "\"No response\" since {desde} ({days} days ago).\n\n"
            "It may be worth following up with the company, "
            "or updating the status if you already heard back."
        ),
    },
    "pt": {
        "subject": "Sua candidatura na {empresa} está há {days} dias sem resposta",
        "body": (
            "Olá {nombre},\n\n"
            "Sua candidatura para a vaga de {puesto} na {empresa} está marcada como "
            "\"Sem resposta\" desde {desde} (há {days} dias).\n\n"
            "Talvez valha a pena escrever para a empresa para fazer um acompanhamento, "
            "ou atualizar o status se você já teve novidades."
        ),
    },
}


def email_configured() -> bool:
    # Sin usuario o contraseña Gmail rechaza el envío, así que se sigue usando la consola
    return bool(settings.smtp_host and settings.smtp_user and settings.smtp_password)


def send_code_email(to: str, nombre: str, code: str, language: str, kind: str) -> None:
    texts = CODE_EMAILS[kind].get(language, CODE_EMAILS[kind]["es"])
    values = {"nombre": nombre, "code": code, "minutes": settings.verification_code_minutes}

    # Sin servidor de correo configurado (desarrollo) el código queda en la consola
    if not email_configured():
        logger.warning("SMTP no configurado. Código de %s para %s: %s", kind, to, code)
        return

    _send(to, texts["subject"].format(**values), texts["body"].format(**values))


def send_no_response_email(
    to: str, nombre: str, empresa: str, puesto: str, desde: date, days: int, language: str
) -> None:
    texts = NO_RESPONSE_EMAILS.get(language, NO_RESPONSE_EMAILS["es"])
    values = {
        "nombre": nombre,
        "empresa": empresa,
        "puesto": puesto,
        "desde": desde.strftime("%d/%m/%Y"),
        "days": days,
    }
    subject = texts["subject"].format(**values)
    body = texts["body"].format(**values)

    if not email_configured():
        logger.warning("SMTP no configurado. Recordatorio para %s:\n%s\n\n%s", to, subject, body)
        return

    _send(to, subject, body)


def _send(to: str, subject: str, body: str) -> None:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from or settings.smtp_user
    message["To"] = to
    message.set_content(body)

    # El puerto 465 usa SSL directo; el resto (587) arranca en texto plano y pasa a TLS
    if settings.smtp_port == 465:
        server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=15)
    else:
        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15)
        server.starttls()
    with server:
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(message)
