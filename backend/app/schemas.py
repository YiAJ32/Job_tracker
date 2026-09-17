from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class ApplicationStatusRead(BaseModel):
    id: int
    nombre: str
    orden: int

    class Config:
        from_attributes = True


class ApplicationBase(BaseModel):
    empresa: str
    puesto: str
    estado_id: int
    descripcion_puesto: Optional[str] = None
    enlace_oferta: Optional[str] = None
    fecha_aplicacion: Optional[date] = None
    notas: Optional[str] = None


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    empresa: Optional[str] = None
    puesto: Optional[str] = None
    estado_id: Optional[int] = None
    descripcion_puesto: Optional[str] = None
    enlace_oferta: Optional[str] = None
    fecha_aplicacion: Optional[date] = None
    notas: Optional[str] = None


class ApplicationRead(BaseModel):
    id: UUID
    empresa: str
    puesto: str
    estado_id: int
    estado: str
    descripcion_puesto: Optional[str] = None
    enlace_oferta: Optional[str] = None
    fecha_aplicacion: Optional[date] = None
    notas: Optional[str] = None
    cv_original_filename: Optional[str] = None
    cv_content_type: Optional[str] = None
    cv_uploaded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
