import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.companies import company_summaries
from app.core.config import settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models import ApplicationStatus, CompanyReview, JobApplication, User
from app.schemas import (
    ProfileApplication,
    ProfileApplications,
    ProfileRead,
    ProfileReview,
    ProfileStatusCount,
    ProfileUpdate,
    ProfileUser,
    UserRead,
)

router = APIRouter(prefix="/api/profile", tags=["profile"])

RECENT_APPLICATIONS = 5

ALLOWED_PHOTO_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_PHOTO_BYTES = 2 * 1024 * 1024

PHOTO_DIR = Path(settings.photo_storage_dir)
PHOTO_DIR.mkdir(parents=True, exist_ok=True)


def _delete_photo_file(user: User) -> None:
    if user.foto_filename:
        (PHOTO_DIR / user.foto_filename).unlink(missing_ok=True)


def _applications_summary(db: Session, user: User) -> ProfileApplications:
    counts = dict(
        db.query(JobApplication.estado_id, func.count(JobApplication.id))
        .filter(JobApplication.user_id == user.id)
        .group_by(JobApplication.estado_id)
        .all()
    )
    statuses = db.query(ApplicationStatus).order_by(ApplicationStatus.orden).all()
    recent = (
        db.query(JobApplication)
        .filter(JobApplication.user_id == user.id)
        .order_by(JobApplication.created_at.desc())
        .limit(RECENT_APPLICATIONS)
        .all()
    )
    return ProfileApplications(
        total=sum(counts.values()),
        por_estado=[
            ProfileStatusCount(id=s.id, nombre=s.nombre, count=counts.get(s.id, 0))
            for s in statuses
        ],
        recientes=[
            ProfileApplication(
                id=a.id,
                empresa=a.company.nombre,
                puesto=a.puesto,
                estado=a.status.nombre,
                fecha_aplicacion=a.fecha_aplicacion,
                created_at=a.created_at,
            )
            for a in recent
        ],
    )


def _my_reviews(db: Session, user: User) -> list[ProfileReview]:
    reviews = (
        db.query(CompanyReview)
        .filter(CompanyReview.user_id == user.id)
        .order_by(CompanyReview.updated_at.desc())
        .all()
    )
    return [
        ProfileReview(
            id=r.id,
            company_id=r.company_id,
            empresa=r.company.nombre,
            calificacion=r.calificacion,
            notas=r.notas,
            verificacion=r.verificacion,
            updated_at=r.updated_at,
        )
        for r in reviews
    ]


@router.get("", response_model=ProfileRead)
def get_profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return ProfileRead(
        user=ProfileUser.model_validate(user),
        solicitudes=_applications_summary(db, user),
        resenas=_my_reviews(db, user),
        empresas_agregadas=company_summaries(db, created_by_id=user.id),
    )


@router.patch("", response_model=UserRead)
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    nombre = payload.nombre.strip()
    if not nombre:
        raise HTTPException(status_code=422, detail="El nombre no puede estar vacío")
    user.nombre = nombre
    db.commit()
    db.refresh(user)
    return user


@router.post("/photo", response_model=UserRead)
async def upload_photo(
    file: UploadFile,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    extension = ALLOWED_PHOTO_TYPES.get(file.content_type)
    if extension is None:
        raise HTTPException(
            status_code=422, detail="La foto tiene que ser una imagen JPG, PNG o WEBP"
        )
    contents = await file.read()
    if len(contents) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=422, detail="La foto no puede pesar más de 2 MB")

    _delete_photo_file(user)
    stored_filename = f"{uuid.uuid4()}{extension}"
    (PHOTO_DIR / stored_filename).write_bytes(contents)

    user.foto_filename = stored_filename
    user.foto_content_type = file.content_type
    user.foto_updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/photo", response_model=UserRead)
def delete_photo(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _delete_photo_file(user)
    user.foto_filename = None
    user.foto_content_type = None
    user.foto_updated_at = None
    db.commit()
    db.refresh(user)
    return user
