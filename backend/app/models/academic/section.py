from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Section(Base):
    __tablename__ = "section"
    __table_args__ = {"schema": "academic"}

    section_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    course_id: Mapped[int] = mapped_column(
        ForeignKey("academic.course.course_id"),
        nullable=False
    )

    teacher_id: Mapped[int] = mapped_column(
        ForeignKey("academic.teacher.teacher_id"),
        nullable=False
    )

    section_name: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    room_number: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
    )

    max_students: Mapped[int] = mapped_column(
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

    teacher = relationship(
        "Teacher",
        back_populates="sections"
    )

    course = relationship(
        "Course",
        back_populates="sections"
    )

    enrollments = relationship(
        "Enrollment",
        back_populates="section"
    )

    attendance_sessions = relationship(
        "AttendanceSession",
        back_populates="section"
    )