from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Enrollment(Base):
    __tablename__ = "enrollment"
    __table_args__ = {"schema": "academic"}

    enrollment_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    student_id: Mapped[int] = mapped_column(
        ForeignKey("academic.student.student_id"),
        nullable=False
    )

    section_id: Mapped[int] = mapped_column(
        ForeignKey("academic.section.section_id"),
        nullable=False
    )

    enrollment_date: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.now
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.now,
        onupdate=datetime.now
    )

    student = relationship(
        "Student",
        back_populates="enrollments"
    )

    section = relationship(
        "Section",
        back_populates="enrollments"
    )