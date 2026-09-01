from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class RecognitionResult(Base):
    __tablename__ = "recognition_result"
    __table_args__ = {"schema": "ai"}

    result_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    recognition_session_id: Mapped[int] = mapped_column(
        ForeignKey("ai.recognition_session.recognition_session_id"),
        nullable=False
    )

    student_id: Mapped[int] = mapped_column(
        ForeignKey("academic.student.student_id"),
        nullable=False
    )

    confidence_score: Mapped[float] = mapped_column(
        Numeric(5, 2),
        nullable=False
    )

    attendance_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    processing_time: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    recognition_session = relationship(
        "RecognitionSession",
        back_populates="recognition_results"
    )

    student = relationship(
        "Student",
        back_populates="recognition_results"
    )