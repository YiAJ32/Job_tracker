from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.profile import PHOTO_DIR
from app.db.session import get_db
from app.models import User

router = APIRouter(prefix="/api/users", tags=["users"])


# Pública: las fotos se muestran con <img>, que no puede mandar el token
@router.get("/{user_id}/photo")
def get_photo(user_id: UUID, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None or not user.foto_filename:
        raise HTTPException(status_code=404, detail="Este usuario no tiene foto")

    path = PHOTO_DIR / user.foto_filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="El archivo de la foto no se encontró")

    return FileResponse(
        path,
        media_type=user.foto_content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
