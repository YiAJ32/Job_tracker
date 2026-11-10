import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import User

logger = logging.getLogger("uvicorn.error")


def purge_unverified_users(db: Session) -> int:
    """Borra las cuentas que nunca confirmaron el email, así ese email queda libre."""
    limit = datetime.now(timezone.utc) - timedelta(days=settings.unverified_account_days)
    deleted = (
        db.query(User)
        .filter(User.email_verificado.is_(False), User.created_at < limit)
        .delete(synchronize_session=False)
    )
    db.commit()
    if deleted:
        logger.info("Se borraron %s cuentas sin confirmar", deleted)
    return deleted
