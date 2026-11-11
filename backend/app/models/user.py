import uuid

from sqlalchemy import Boolean, Column, DateTime, Integer, String, false, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    email_verificado = Column(Boolean, nullable=False, default=False, server_default=false())
    codigo_verificacion_hash = Column(String, nullable=True)
    codigo_verificacion_expira = Column(DateTime(timezone=True), nullable=True)
    codigo_verificacion_intentos = Column(Integer, nullable=False, default=0, server_default="0")
    codigo_verificacion_envios = Column(Integer, nullable=False, default=0, server_default="0")
    codigo_verificacion_envios_desde = Column(DateTime(timezone=True), nullable=True)
    codigo_reset_hash = Column(String, nullable=True)
    codigo_reset_expira = Column(DateTime(timezone=True), nullable=True)
    codigo_reset_intentos = Column(Integer, nullable=False, default=0, server_default="0")
    codigo_reset_envios = Column(Integer, nullable=False, default=0, server_default="0")
    codigo_reset_envios_desde = Column(DateTime(timezone=True), nullable=True)
    # Los tokens emitidos antes de esta fecha dejan de valer (cambio de contraseña)
    password_actualizada_en = Column(DateTime(timezone=True), nullable=True)
    ultimo_login = Column(DateTime(timezone=True), nullable=True)
    foto_filename = Column(String, nullable=True)
    foto_content_type = Column(String, nullable=True)
    foto_updated_at = Column(DateTime(timezone=True), nullable=True)
    # Último idioma usado en la app, para los correos que se mandan sin una petición del usuario
    idioma = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    @property
    def foto_url(self) -> str | None:
        if not self.foto_filename:
            return None
        # El parámetro v cambia con cada foto nueva para que el navegador no use la vieja
        version = int(self.foto_updated_at.timestamp()) if self.foto_updated_at else 0
        return f"/api/users/{self.id}/photo?v={version}"
