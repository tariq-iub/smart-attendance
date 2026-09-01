from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class FaceRegistration(Base):
    __tablename__ = "face_registration"
    __table_args__ = {"schema": "ai"}

    registration_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    student_id: Mapped[int] = mapped_column(
        ForeignKey("academic.student.student_id"),
        nullable=False
    )

    registration_date: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    total_images: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=5
    )

    registration_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    remarks: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    student = relationship(
        "Student",
        back_populates="face_registrations"
    )