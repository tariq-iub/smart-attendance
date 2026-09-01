from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Program(Base):
    __tablename__ = "program"
    __table_args__ = {"schema": "academic"}

    program_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    department_id: Mapped[int] = mapped_column(
        ForeignKey("academic.department.department_id"),
        nullable=False
    )

    program_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    program_code: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    duration_years: Mapped[int] = mapped_column(
        Integer,
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

    department = relationship(
        "Department",
        back_populates="programs"
    )

    semesters = relationship(
        "Semester",
        back_populates="program"
    )

    courses = relationship(
        "Course",
        back_populates="program"
    )

    students = relationship(
        "Student",
        back_populates="program"
    )