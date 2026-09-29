from fastapi import APIRouter, HTTPException

from app.schemas import MatchRequest, MatchResult
from app.services.ats import analyze_match

router = APIRouter(prefix="/api/match", tags=["match"])


@router.post("", response_model=MatchResult)
def evaluate_match(payload: MatchRequest):
    if not payload.cv_text.strip():
        raise HTTPException(status_code=400, detail="El CV está vacío")
    if not payload.job_description.strip():
        raise HTTPException(status_code=400, detail="La descripción del puesto está vacía")

    return analyze_match(payload.cv_text, payload.job_description)
