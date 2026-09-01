from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class AttendanceAdjustment(Base):
    __tablename__ = "attendance_adjustment"
    __table_args__ = {"schema": "attendance"}

    attendance_adjustment_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    attendance_id: Mapped[int] = mapped_column(
        ForeignKey("attendance.attendance.attendance_id"),
        nullable=False
    )

    adjusted_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    previous_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    new_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    adjustment_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    adjusted_at: Mapped[datetime] = mapped_column(
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
        back_populates="adjustments"
    )