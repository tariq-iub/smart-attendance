from datetime import date, datetime, time

from pydantic import Field

from app.schemas.base import BaseSchema


class AttendanceSessionCreate(BaseSchema):
    teacher_id: int = Field(gt=0)
    course_id: int = Field(gt=0)
    section_id: int = Field(gt=0)


class AttendanceSessionUpdate(BaseSchema):
    section_id: int | None = None
    teacher_id: int | None = None
    session_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    session_status: str | None = Field(
        default=None,
        max_length=20,
    )
    total_students: int | None = Field(
        default=None,
        ge=0,
    )
    present_students: int | None = Field(
        default=None,
        ge=0,
    )
    absent_students: int | None = Field(
        default=None,
        ge=0,
    )
    late_students: int | None = Field(
        default=None,
        ge=0,
    )


class AttendanceSessionRead(BaseSchema):
    attendance_session_id: int
    section_id: int
    teacher_id: int
    session_date: date
    start_time: time
    end_time: time | None
    session_status: str
    total_students: int | None
    present_students: int | None
    absent_students: int | None
    late_students: int | None
    created_at: datetime
    updated_at: datetime