import logging
import smtplib
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


def send_code_email(to: str, nombre: str, code: str, language: str, kind: str) -> None:
    texts = CODE_EMAILS[kind].get(language, CODE_EMAILS[kind]["es"])
    values = {"nombre": nombre, "code": code, "minutes": settings.verification_code_minutes}

    # Sin servidor de correo configurado (desarrollo) el código queda en la consola
    if not settings.smtp_host:
        logger.warning("SMTP no configurado. Código de %s para %s: %s", kind, to, code)
        return

    message = EmailMessage()
    message["Subject"] = texts["subject"].format(**values)
    message["From"] = settings.smtp_from or settings.smtp_user
    message["To"] = to
    message.set_content(texts["body"].format(**values))

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
