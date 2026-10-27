import uuid

from sqlalchemy import Column, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    foto_filename = Column(String, nullable=True)
    foto_content_type = Column(String, nullable=True)
    foto_updated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    @property
    def foto_url(self) -> str | None:
        if not self.foto_filename:
            return None
        # El parámetro v cambia con cada foto nueva para que el navegador no use la vieja
        version = int(self.foto_updated_at.timestamp()) if self.foto_updated_at else 0
        return f"/api/users/{self.id}/photo?v={version}"
