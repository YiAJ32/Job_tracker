from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/job_tracker"
    cors_origins: str = "http://localhost:5173"
    cv_storage_dir: str = "storage/cvs"

    class Config:
        env_file = ".env"


settings = Settings()
