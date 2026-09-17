import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    estado_id = Column(SmallInteger, ForeignKey("application_statuses.id"), nullable=False)
    puesto = Column(String, nullable=False)
    descripcion_puesto = Column(Text, nullable=True)
    enlace_oferta = Column(String, nullable=True)
    fecha_aplicacion = Column(Date, nullable=True)
    notas = Column(Text, nullable=True)
    cv_original_filename = Column(String, nullable=True)
    cv_stored_filename = Column(String, nullable=True)
    cv_content_type = Column(String, nullable=True)
    cv_uploaded_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company")
    status = relationship("ApplicationStatus")
