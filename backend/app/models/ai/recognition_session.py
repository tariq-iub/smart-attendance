from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class RecognitionSession(Base):
    __tablename__ = "recognition_session"
    __table_args__ = {"schema": "ai"}

    recognition_session_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    attendance_session_id: Mapped[int] = mapped_column(
        ForeignKey("attendance.attendance_session.attendance_session_id"),
        nullable=False
    )

    camera_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    location: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    total_faces_detected: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    total_faces_recognized: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime,
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

    attendance_session = relationship(
        "AttendanceSession",
        back_populates="recognition_sessions"
    )

    recognition_results = relationship(
        "RecognitionResult",
        back_populates="recognition_session"
    )

    verification_logs = relationship(
        "FaceVerificationLog",
        back_populates="recognition_session"
    )