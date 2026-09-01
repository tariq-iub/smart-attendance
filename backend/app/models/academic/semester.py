from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Semester(Base):
    __tablename__ = "semester"
    __table_args__ = {"schema": "academic"}

    semester_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    program_id: Mapped[int] = mapped_column(
        ForeignKey("academic.program.program_id"),
        nullable=False
    )

    semester_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    semester_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    program = relationship(
        "Program",
        back_populates="semesters"
    )

    courses = relationship(
        "Course",
        back_populates="semester"
    )

    students = relationship(
        "Student",
        back_populates="semester"
    )