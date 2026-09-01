from datetime import date, datetime
from decimal import Decimal

from pydantic import Field

from app.schemas.base import BaseSchema


class AttendanceSummaryCreate(BaseSchema):
    attendance_session_id: int
    total_students: int = Field(ge=0)
    present_students: int = Field(ge=0)
    absent_students: int = Field(ge=0)
    late_students: int = Field(ge=0)
    attendance_percentage: Decimal = Field(ge=0, le=100)
    summary_date: date


class AttendanceSummaryUpdate(BaseSchema):
    total_students: int | None = Field(default=None, ge=0)
    present_students: int | None = Field(default=None, ge=0)
    absent_students: int | None = Field(default=None, ge=0)
    late_students: int | None = Field(default=None, ge=0)
    attendance_percentage: Decimal | None = Field(
        default=None,
        ge=0,
        le=100,
    )
    summary_date: date | None = None


class AttendanceSummaryRead(BaseSchema):
    attendance_summary_id: int
    attendance_session_id: int
    total_students: int
    present_students: int
    absent_students: int
    late_students: int
    attendance_percentage: Decimal
    summary_date: date
    created_at: datetime
    updated_at: datetime
