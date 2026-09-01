from datetime import datetime

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class RolePermission(Base):
    __tablename__ = "role_permission"
    __table_args__ = {"schema": "auth"}

    role_permission_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    role_id: Mapped[int] = mapped_column(
        ForeignKey("auth.role.role_id"),
        nullable=False
    )

    permission_id: Mapped[int] = mapped_column(
        ForeignKey("auth.permission.permission_id"),
        nullable=False
    )

    granted_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    granted_by: Mapped[int | None] = mapped_column(
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    created_by: Mapped[int] = mapped_column(
        nullable=False
    )

    role = relationship(
        "Role",
        back_populates="role_permissions"
    )

    permission = relationship(
        "Permission",
        back_populates="role_permissions"
    )
