import uuid
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models import ApplicationStatus, Company, JobApplication, User
from app.schemas import ApplicationCreate, ApplicationRead, ApplicationUpdate

router = APIRouter(prefix="/api/applications", tags=["applications"])

ALLOWED_CV_TYPES = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}

STORAGE_DIR = Path(settings.cv_storage_dir)
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def _get_or_create_company(db: Session, nombre: str) -> Company:
    nombre = nombre.strip()
    company = (
        db.query(Company)
        .filter(func.lower(Company.nombre) == nombre.lower())
        .first()
    )
    if company is None:
        company = Company(nombre=nombre)
        db.add(company)
        db.flush()
    return company


def _get_status_or_404(db: Session, estado_id: int) -> ApplicationStatus:
    status = db.get(ApplicationStatus, estado_id)
    if status is None:
        raise HTTPException(status_code=422, detail=f"estado_id {estado_id} no existe")
    return status


def _get_application_or_404(db: Session, application_id: UUID, user: User) -> JobApplication:
    application = db.get(JobApplication, application_id)
    # Las solicitudes de otros usuarios se tratan como inexistentes
    if application is None or application.user_id != user.id:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return application


def _delete_cv_file(application: JobApplication) -> None:
    if application.cv_stored_filename:
        (STORAGE_DIR / application.cv_stored_filename).unlink(missing_ok=True)


def _to_read(application: JobApplication) -> ApplicationRead:
    return ApplicationRead(
        id=application.id,
        empresa=application.company.nombre,
        puesto=application.puesto,
        estado_id=application.estado_id,
        estado=application.status.nombre,
        descripcion_puesto=application.descripcion_puesto,
        enlace_oferta=application.enlace_oferta,
        fecha_aplicacion=application.fecha_aplicacion,
        notas=application.notas,
        cv_original_filename=application.cv_original_filename,
        cv_content_type=application.cv_content_type,
        cv_uploaded_at=application.cv_uploaded_at,
        created_at=application.created_at,
        updated_at=application.updated_at,
    )


@router.get("", response_model=list[ApplicationRead])
def list_applications(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    applications = (
        db.query(JobApplication)
        .filter(JobApplication.user_id == user.id)
        .order_by(JobApplication.created_at.desc())
        .all()
    )
    return [_to_read(a) for a in applications]


@router.post("", response_model=ApplicationRead, status_code=201)
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_status_or_404(db, payload.estado_id)
    company = _get_or_create_company(db, payload.empresa)

    application = JobApplication(
        company_id=company.id,
        user_id=user.id,
        estado_id=payload.estado_id,
        puesto=payload.puesto,
        descripcion_puesto=payload.descripcion_puesto,
        enlace_oferta=payload.enlace_oferta,
        fecha_aplicacion=payload.fecha_aplicacion,
        notas=payload.notas,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return _to_read(application)


@router.get("/{application_id}", response_model=ApplicationRead)
def get_application(
    application_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    application = _get_application_or_404(db, application_id, user)
    return _to_read(application)


@router.put("/{application_id}", response_model=ApplicationRead)
def update_application(
    application_id: UUID,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    application = _get_application_or_404(db, application_id, user)
    data = payload.model_dump(exclude_unset=True)

    if "empresa" in data:
        company = _get_or_create_company(db, data.pop("empresa"))
        application.company_id = company.id
    if "estado_id" in data:
        _get_status_or_404(db, data["estado_id"])

    for field, value in data.items():
        setattr(application, field, value)

    db.commit()
    db.refresh(application)
    return _to_read(application)


@router.delete("/{application_id}", status_code=204)
def delete_application(
    application_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    application = _get_application_or_404(db, application_id, user)
    _delete_cv_file(application)
    db.delete(application)
    db.commit()


@router.post("/{application_id}/cv", response_model=ApplicationRead)
async def upload_cv(
    application_id: UUID,
    file: UploadFile,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    application = _get_application_or_404(db, application_id, user)

    extension = ALLOWED_CV_TYPES.get(file.content_type)
    if extension is None:
        raise HTTPException(
            status_code=422,
            detail="Solo se permiten archivos PDF o Word (.pdf, .doc, .docx)",
        )

    _delete_cv_file(application)

    stored_filename = f"{uuid.uuid4()}{extension}"
    contents = await file.read()
    (STORAGE_DIR / stored_filename).write_bytes(contents)

    application.cv_original_filename = file.filename
    application.cv_stored_filename = stored_filename
    application.cv_content_type = file.content_type
    application.cv_uploaded_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(application)
    return _to_read(application)


@router.get("/{application_id}/cv")
def get_cv(
    application_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    application = _get_application_or_404(db, application_id, user)
    if not application.cv_stored_filename:
        raise HTTPException(status_code=404, detail="Esta solicitud no tiene CV cargado")

    path = STORAGE_DIR / application.cv_stored_filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="El archivo del CV no se encontró")

    return FileResponse(
        path,
        media_type=application.cv_content_type,
        filename=application.cv_original_filename,
        content_disposition_type="inline",
    )


@router.delete("/{application_id}/cv", response_model=ApplicationRead)
def delete_cv(
    application_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    application = _get_application_or_404(db, application_id, user)
    _delete_cv_file(application)

    application.cv_original_filename = None
    application.cv_stored_filename = None
    application.cv_content_type = None
    application.cv_uploaded_at = None

    db.commit()
    db.refresh(application)
    return _to_read(application)
