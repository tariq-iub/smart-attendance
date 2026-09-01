from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class FaceVerificationLog(Base):
    __tablename__ = "face_verification_log"
    __table_args__ = {"schema": "ai"}

    verification_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    student_id: Mapped[int] = mapped_column(
        ForeignKey("academic.student.student_id"),
        nullable=False
    )

    session_id: Mapped[int] = mapped_column(
        ForeignKey("ai.recognition_session.recognition_session_id"),
        nullable=False
    )

    confidence_score: Mapped[float] = mapped_column(
        Numeric(5, 2),
        nullable=False
    )

    verification_result: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    captured_image: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    verified_at: Mapped[datetime] = mapped_column(
        DateTime,
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

    student = relationship(
        "Student",
        back_populates="verification_logs"
    )

    recognition_session = relationship(
        "RecognitionSession",
        back_populates="verification_logs"
    )