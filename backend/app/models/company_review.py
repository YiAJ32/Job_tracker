import uuid

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class CompanyReview(Base):
    __tablename__ = "company_reviews"
    __table_args__ = (
        UniqueConstraint("company_id", "user_id", name="uq_company_reviews_company_user"),
        CheckConstraint(
            "calificacion BETWEEN 1 AND 5", name="ck_company_reviews_calificacion_range"
        ),
        CheckConstraint(
            "verificacion IN ('existe', 'fantasma')",
            name="ck_company_reviews_verificacion_values",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    calificacion = Column(SmallInteger, nullable=False)
    notas = Column(Text, nullable=True)
    # None = el usuario no opinó sobre si la empresa existe
    verificacion = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company", back_populates="reviews")
    user = relationship("User")
