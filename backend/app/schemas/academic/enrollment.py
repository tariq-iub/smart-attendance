from datetime import date, datetime

from pydantic import Field

from app.schemas.base import BaseSchema


class EnrollmentCreate(BaseSchema):
    student_id: int
    section_id: int
    enrollment_date: date
    status: str = Field(min_length=1, max_length=20)


class EnrollmentUpdate(BaseSchema):
    student_id: int | None = None
    section_id: int | None = None
    enrollment_date: date | None = None
    status: str | None = Field(default=None, max_length=20)


class EnrollmentRead(BaseSchema):
    enrollment_id: int
    student_id: int
    section_id: int
    enrollment_date: date
    status: str
    created_at: datetime
    updated_at: datetime
