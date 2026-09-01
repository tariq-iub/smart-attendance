from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Student(Base):
    __tablename__ = "student"
    __table_args__ = {"schema": "academic"}

    student_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    program_id: Mapped[int] = mapped_column(
        ForeignKey("academic.program.program_id"),
        nullable=False
    )

    semester_id: Mapped[int] = mapped_column(
        ForeignKey("academic.semester.semester_id"),
        nullable=False
    )

    registration_no: Mapped[str] = mapped_column(
        String(30),
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

    gender: Mapped[str] = mapped_column(
        String(10),
        nullable=False
    )

    date_of_birth: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    admission_year: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    current_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    program = relationship(
        "Program",
        back_populates="students"
    )

    semester = relationship(
        "Semester",
        back_populates="students"
    )

    enrollments = relationship(
        "Enrollment",
        back_populates="student"
    )

    attendance_records = relationship(
        "Attendance",
        back_populates="student"
    )

    face_registrations = relationship(
        "FaceRegistration",
        back_populates="student"
    )

    face_embeddings = relationship(
        "FaceEmbedding",
        back_populates="student"
    )

    recognition_results = relationship(
        "RecognitionResult",
        back_populates="student"
    )

    verification_logs = relationship(
        "FaceVerificationLog",
        back_populates="student"
    )