from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = {"schema": "attendance"}

    attendance_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    attendance_session_id: Mapped[int] = mapped_column(
        ForeignKey("attendance.attendance_session.attendance_session_id"),
        nullable=False
    )

    student_id: Mapped[int] = mapped_column(
        ForeignKey("academic.student.student_id"),
        nullable=False
    )

    attendance_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    check_in_time: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    confidence_score: Mapped[float | None] = mapped_column(
        Numeric(5, 2),
        nullable=True
    )

    verification_method: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
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

    attendance_session = relationship(
        "AttendanceSession",
        back_populates="attendance_records"
    )

    student = relationship(
        "Student",
        back_populates="attendance_records"
    )

    adjustments = relationship(
        "AttendanceAdjustment",
        back_populates="attendance"
    )

    audit_logs = relationship(
        "AttendanceAuditLog",
        back_populates="attendance"
    )