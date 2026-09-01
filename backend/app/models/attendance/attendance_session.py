from datetime import date, datetime, time

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class AttendanceSession(Base):
    __tablename__ = "attendance_session"
    __table_args__ = {"schema": "attendance"}

    attendance_session_id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    section_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("academic.section.section_id"),
        nullable=False,
    )

    teacher_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("academic.teacher.teacher_id"),
        nullable=False,
    )

    session_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    start_time: Mapped[time] = mapped_column(
        Time,
        nullable=False,
    )

    end_time: Mapped[time | None] = mapped_column(
        Time,
        nullable=True,
    )

    session_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    total_students: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    present_students: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    absent_students: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    late_students: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

    section = relationship(
        "Section",
        back_populates="attendance_sessions",
    )

    teacher = relationship(
        "Teacher",
        back_populates="attendance_sessions",
    )

    recognition_sessions = relationship(
        "RecognitionSession",
        back_populates="attendance_session",
    )

    summaries = relationship(
        "AttendanceSummary",
        back_populates="attendance_session",
    )

    attendance_records = relationship(
        "Attendance",
        back_populates="attendance_session",
    )