from datetime import datetime

from pydantic import Field

from app.schemas.base import BaseSchema


class AttendanceAuditLogCreate(BaseSchema):
    attendance_id: int
    action: str = Field(min_length=1, max_length=50)
    performed_by: str = Field(min_length=1, max_length=100)
    details: str | None = None
    action_time: datetime


class AttendanceAuditLogRead(BaseSchema):
    attendance_audit_log_id: int
    attendance_id: int
    action: str
    performed_by: str
    details: str | None
    action_time: datetime
    created_at: datetime
    updated_at: datetime
