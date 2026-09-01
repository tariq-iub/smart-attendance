from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Course(Base):
    __tablename__ = "course"
    __table_args__ = {"schema": "academic"}

    course_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    program_id: Mapped[int] = mapped_column(
        ForeignKey("academic.program.program_id"),
        nullable=False
    )

    semester_id: Mapped[int] = mapped_column(
        ForeignKey("academic.semester.semester_id"),
        nullable=False
    )

    course_code: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    course_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    credit_hours: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    is_lab: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False
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
        back_populates="courses"
    )

    semester = relationship(
        "Semester",
        back_populates="courses"
    )

    sections = relationship(
        "Section",
        back_populates="course"
    )