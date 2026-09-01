from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Department(Base):
    __tablename__ = "department"
    __table_args__ = {"schema": "academic"}

    department_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    department_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    department_code: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    programs = relationship(
        "Program",
        back_populates="department"
    )

    teachers = relationship(
        "Teacher",
        back_populates="department"
    )