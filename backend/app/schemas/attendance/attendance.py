from datetime import datetime
from decimal import Decimal

from pydantic import Field

from app.schemas.base import BaseSchema


class AttendanceCreate(BaseSchema):
    attendance_session_id: int
    student_id: int
    attendance_status: str = Field(min_length=1, max_length=20)
    check_in_time: datetime | None = None
    confidence_score: Decimal | None = Field(default=None, ge=0, le=100)
    verification_method: str | None = Field(default=None, max_length=30)
    remarks: str | None = None


class AttendanceUpdate(BaseSchema):
    attendance_status: str | None = Field(default=None, max_length=20)
    check_in_time: datetime | None = None
    confidence_score: Decimal | None = Field(default=None, ge=0, le=100)
    verification_method: str | None = Field(default=None, max_length=30)
    remarks: str | None = None


class AttendanceRead(BaseSchema):
    attendance_id: int
    attendance_session_id: int
    student_id: int
    attendance_status: str
    check_in_time: datetime | None
    confidence_score: Decimal | None
    verification_method: str | None
    remarks: str | None
    created_at: datetime
    updated_at: datetime
