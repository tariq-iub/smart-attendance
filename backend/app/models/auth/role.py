from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Role(Base):
    __tablename__ = "role"
    __table_args__ = {"schema": "auth"}

    role_id: Mapped[int] = mapped_column(primary_key=True)

    role_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    role_description: Mapped[str | None] = mapped_column(
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

    user_roles = relationship(
        "UserRole",
        back_populates="role"
    )

    role_permissions = relationship(
        "RolePermission",
        back_populates="role"
    )