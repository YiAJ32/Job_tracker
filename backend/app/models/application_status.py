from sqlalchemy import Column, SmallInteger, String

from app.db.session import Base


class ApplicationStatus(Base):
    __tablename__ = "application_statuses"

    id = Column(SmallInteger, primary_key=True)
    nombre = Column(String, nullable=False)
    orden = Column(SmallInteger, nullable=False)
