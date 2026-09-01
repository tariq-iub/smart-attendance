from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Permission(Base):
    __tablename__ = "permission"
    __table_args__ = {"schema": "auth"}

    permission_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    permission_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    permission_description: Mapped[str | None] = mapped_column(
        String(255),
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

    role_permissions = relationship(
        "RolePermission",
        back_populates="permission"
    )