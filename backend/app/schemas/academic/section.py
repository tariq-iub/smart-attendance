from datetime import datetime

from pydantic import Field

from app.schemas.base import BaseSchema


class SectionCreate(BaseSchema):
    course_id: int
    teacher_id: int
    section_name: str = Field(min_length=1, max_length=20)
    room_number: str | None = Field(default=None, max_length=20)
    max_students: int = Field(ge=1)


class SectionUpdate(BaseSchema):
    course_id: int | None = None
    teacher_id: int | None = None
    section_name: str | None = Field(default=None, max_length=20)
    room_number: str | None = Field(default=None, max_length=20)
    max_students: int | None = Field(default=None, ge=1)


class SectionRead(BaseSchema):
    section_id: int
    course_id: int
    teacher_id: int
    section_name: str
    room_number: str | None
    max_students: int
    created_at: datetime
    updated_at: datetime
