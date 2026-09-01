from datetime import datetime

from pydantic import Field

from app.schemas.base import BaseSchema


class SemesterCreate(BaseSchema):
    program_id: int
    semester_number: int = Field(ge=1)
    semester_name: str = Field(min_length=1, max_length=50)
    is_active: bool = True


class SemesterUpdate(BaseSchema):
    program_id: int | None = None
    semester_number: int | None = Field(default=None, ge=1)
    semester_name: str | None = Field(default=None, max_length=50)
    is_active: bool | None = None


class SemesterRead(BaseSchema):
    semester_id: int
    program_id: int
    semester_number: int
    semester_name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
