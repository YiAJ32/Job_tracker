from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models import Company, CompanyReview, User
from app.schemas import CompanyCreate, CompanyRead, ReviewRead, ReviewUpsert

router = APIRouter(prefix="/api/companies", tags=["companies"])


def _get_company_or_404(db: Session, company_id: UUID) -> Company:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return company


def _company_summaries(db: Session, company_id: UUID | None = None) -> list[CompanyRead]:
    query = (
        db.query(
            Company,
            User.nombre,
            func.avg(CompanyReview.calificacion),
            func.count(CompanyReview.id),
            func.count(case((CompanyReview.verificacion == "existe", 1))),
            func.count(case((CompanyReview.verificacion == "fantasma", 1))),
        )
        .outerjoin(User, User.id == Company.created_by_id)
        .outerjoin(CompanyReview, CompanyReview.company_id == Company.id)
        .group_by(Company.id, User.nombre)
        .order_by(func.lower(Company.nombre))
    )
    if company_id is not None:
        query = query.filter(Company.id == company_id)

    return [
        CompanyRead(
            id=company.id,
            nombre=company.nombre,
            sitio_web=company.sitio_web,
            agregada_por=autor,
            promedio=round(float(promedio), 1) if promedio is not None else None,
            total_resenas=total,
            votos_existe=existe,
            votos_fantasma=fantasma,
        )
        for company, autor, promedio, total, existe, fantasma in query.all()
    ]


def _review_to_read(review: CompanyReview) -> ReviewRead:
    return ReviewRead(
        id=review.id,
        user_id=review.user_id,
        autor=review.user.nombre,
        calificacion=review.calificacion,
        notas=review.notas,
        verificacion=review.verificacion,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


@router.get("", response_model=list[CompanyRead])
def list_companies(db: Session = Depends(get_db)):
    return _company_summaries(db)


@router.post("", response_model=CompanyRead, status_code=201)
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    nombre = payload.nombre.strip()
    existing = (
        db.query(Company).filter(func.lower(Company.nombre) == nombre.lower()).first()
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail=f"La empresa {existing.nombre} ya existe")

    company = Company(
        nombre=nombre,
        sitio_web=(payload.sitio_web or "").strip() or None,
        created_by_id=user.id,
    )
    db.add(company)
    db.commit()
    return _company_summaries(db, company.id)[0]


@router.get("/{company_id}/reviews", response_model=list[ReviewRead])
def list_reviews(company_id: UUID, db: Session = Depends(get_db)):
    _get_company_or_404(db, company_id)
    reviews = (
        db.query(CompanyReview)
        .filter(CompanyReview.company_id == company_id)
        .order_by(CompanyReview.updated_at.desc())
        .all()
    )
    return [_review_to_read(r) for r in reviews]


@router.put("/{company_id}/reviews/me", response_model=ReviewRead)
def upsert_my_review(
    company_id: UUID,
    payload: ReviewUpsert,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_company_or_404(db, company_id)
    review = (
        db.query(CompanyReview)
        .filter(CompanyReview.company_id == company_id, CompanyReview.user_id == user.id)
        .first()
    )
    if review is None:
        review = CompanyReview(company_id=company_id, user_id=user.id)
        db.add(review)

    review.calificacion = payload.calificacion
    review.notas = (payload.notas or "").strip() or None
    review.verificacion = payload.verificacion

    db.commit()
    db.refresh(review)
    return _review_to_read(review)


@router.delete("/{company_id}/reviews/me", status_code=204)
def delete_my_review(
    company_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    review = (
        db.query(CompanyReview)
        .filter(CompanyReview.company_id == company_id, CompanyReview.user_id == user.id)
        .first()
    )
    if review is None:
        raise HTTPException(status_code=404, detail="No dejaste una reseña para esta empresa")
    db.delete(review)
    db.commit()
