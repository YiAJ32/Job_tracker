from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import ApplicationStatus
from app.schemas import ApplicationStatusRead

router = APIRouter(prefix="/api/statuses", tags=["statuses"])


@router.get("", response_model=list[ApplicationStatusRead])
def list_statuses(db: Session = Depends(get_db)):
    return db.query(ApplicationStatus).order_by(ApplicationStatus.orden).all()
