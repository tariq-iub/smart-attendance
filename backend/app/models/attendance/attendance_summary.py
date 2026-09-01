from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class AttendanceSummary(Base):
    __tablename__ = "attendance_summary"
    __table_args__ = {"schema": "attendance"}

    attendance_summary_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    attendance_session_id: Mapped[int] = mapped_column(
        ForeignKey("attendance.attendance_session.attendance_session_id"),
        nullable=False
    )

    total_students: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    present_students: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    absent_students: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    late_students: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    attendance_percentage: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    summary_date: Mapped[date] = mapped_column(
        Date,
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

    attendance_session = relationship(
        "AttendanceSession",
        back_populates="summaries"
    )