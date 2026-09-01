from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class FaceEmbedding(Base):
    __tablename__ = "face_embedding"
    __table_args__ = {"schema": "ai"}

    embedding_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    student_id: Mapped[int] = mapped_column(
        ForeignKey("academic.student.student_id"),
        nullable=False
    )

    embedding_vector: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    model_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    embedding_version: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
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

    student = relationship(
        "Student",
        back_populates="face_embeddings"
    )