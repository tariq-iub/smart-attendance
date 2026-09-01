from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class AttendanceAuditLog(Base):
    __tablename__ = "attendance_audit_log"
    __table_args__ = {"schema": "attendance"}

    audit_log_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    attendance_id: Mapped[int] = mapped_column(
        ForeignKey("attendance.attendance.attendance_id"),
        nullable=False
    )

    action_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    performed_by: Mapped[int] = mapped_column(
        nullable=False
    )

    old_value: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    new_value: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    action_time: Mapped[datetime] = mapped_column(
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

    attendance = relationship(
        "Attendance",
        back_populates="audit_logs"
    )