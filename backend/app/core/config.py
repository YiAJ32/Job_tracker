from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/job_tracker"
    cors_origins: str = "http://localhost:5173"
    cv_storage_dir: str = "storage/cvs"
    photo_storage_dir: str = "storage/photos"
    jwt_secret: str
    jwt_expire_minutes: int = 60 * 24 * 7
    # Sin smtp_host los códigos de confirmación se muestran en la consola del backend
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    verification_code_minutes: int = 15
    # Las cuentas que no confirman el email en este plazo se borran
    unverified_account_days: int = 7
    # Días en "Sin respuesta" antes de mandar el recordatorio por correo, y cada cuánto se revisa
    no_response_reminder_days: int = 14
    reminder_check_minutes: int = 60

    class Config:
        env_file = ".env"


settings = Settings()
