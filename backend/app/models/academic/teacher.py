from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Teacher(Base):
    __tablename__ = "teacher"
    __table_args__ = {"schema": "academic"}

    teacher_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    department_id: Mapped[int] = mapped_column(
        ForeignKey("academic.department.department_id"),
        nullable=False
    )

    teacher_code: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    first_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    last_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    email: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    phone: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
    )

    designation: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    department = relationship(
        "Department",
        back_populates="teachers"
    )

    sections = relationship(
        "Section",
        back_populates="teacher"
    )

    attendance_sessions = relationship(
        "AttendanceSession",
        back_populates="teacher"
    )