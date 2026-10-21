from datetime import date, datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


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


class UserRegister(BaseModel):
    nombre: str = Field(min_length=1, max_length=80)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=72)


class UserLogin(BaseModel):
    email: str
    password: str


class UserRead(BaseModel):
    id: UUID
    nombre: str
    email: str

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    token: str
    user: UserRead


class CompanyCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    sitio_web: Optional[str] = None


class CompanyRead(BaseModel):
    id: UUID
    nombre: str
    sitio_web: Optional[str] = None
    agregada_por: Optional[str] = None
    promedio: Optional[float] = None
    total_resenas: int
    votos_existe: int
    votos_fantasma: int


class ReviewUpsert(BaseModel):
    calificacion: int = Field(ge=1, le=5)
    notas: Optional[str] = Field(default=None, max_length=2000)
    verificacion: Optional[Literal["existe", "fantasma"]] = None


class ReviewRead(BaseModel):
    id: UUID
    user_id: UUID
    autor: str
    calificacion: int
    notas: Optional[str] = None
    verificacion: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class MatchRequest(BaseModel):
    cv_text: str
    job_description: str


class MatchKeyword(BaseModel):
    term: str
    weight: float


class MatchResult(BaseModel):
    score: int
    level: str
    total_keywords: int
    matched_count: int
    matched_keywords: list[MatchKeyword]
    missing_keywords: list[MatchKeyword]


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
