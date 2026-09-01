from datetime import datetime

from pydantic import Field

from app.schemas.base import BaseSchema


class AttendanceAdjustmentCreate(BaseSchema):
    attendance_id: int
    adjusted_by: str = Field(min_length=1, max_length=100)
    previous_status: str = Field(min_length=1, max_length=20)
    new_status: str = Field(min_length=1, max_length=20)
    adjustment_reason: str | None = None
    adjusted_at: datetime


class AttendanceAdjustmentUpdate(BaseSchema):
    adjusted_by: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    previous_status: str | None = Field(
        default=None,
        min_length=1,
        max_length=20,
    )
    new_status: str | None = Field(
        default=None,
        min_length=1,
        max_length=20,
    )
    adjustment_reason: str | None = None
    adjusted_at: datetime | None = None


class AttendanceAdjustmentRead(BaseSchema):
    attendance_adjustment_id: int
    attendance_id: int
    adjusted_by: str
    previous_status: str
    new_status: str
    adjustment_reason: str | None
    adjusted_at: datetime
    created_at: datetime
    updated_at: datetime