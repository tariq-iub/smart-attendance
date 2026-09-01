from datetime import datetime

from pydantic import Field

from app.schemas.base import BaseSchema


class LoginAuditCreate(BaseSchema):
    user_id: int
    login_time: datetime
    logout_time: datetime | None = None
    ip_address: str | None = Field(default=None, max_length=45)
    device_info: str | None = None
    login_status: str = Field(min_length=1, max_length=30)


class LoginAuditRead(LoginAuditCreate):
    login_audit_id: int
    created_at: datetime
    updated_at: datetime
