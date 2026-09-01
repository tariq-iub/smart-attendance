from datetime import datetime

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class UserRole(Base):
    __tablename__ = "user_role"
    __table_args__ = {"schema": "auth"}

    user_role_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("auth.user_account.user_id"),
        nullable=False
    )

    role_id: Mapped[int] = mapped_column(
        ForeignKey("auth.role.role_id"),
        nullable=False
    )

    assigned_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    assigned_by: Mapped[int | None] = mapped_column(
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    created_by: Mapped[int] = mapped_column(
        nullable=False
    )

    user = relationship(
        "UserAccount",
        back_populates="user_roles"
    )

    role = relationship(
        "Role",
        back_populates="user_roles"
    )
