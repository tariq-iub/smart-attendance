from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class LoginAudit(Base):
    __tablename__ = "login_audit"
    __table_args__ = {"schema": "auth"}

    login_audit_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("auth.user_account.user_id"),
        nullable=False
    )

    login_time: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    logout_time: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    ip_address: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True
    )

    device_info: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    login_status: Mapped[str] = mapped_column(
        String(30),
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

    user = relationship(
        "UserAccount",
        back_populates="login_audits"
    )