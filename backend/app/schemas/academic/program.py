from datetime import datetime

from pydantic import Field

from app.schemas.base import BaseSchema


class ProgramCreate(BaseSchema):
    department_id: int
    program_name: str = Field(min_length=1, max_length=100)
    program_code: str = Field(min_length=1, max_length=20)
    duration_years: int = Field(ge=1)


class ProgramUpdate(BaseSchema):
    department_id: int | None = None
    program_name: str | None = Field(default=None, max_length=100)
    program_code: str | None = Field(default=None, max_length=20)
    duration_years: int | None = Field(default=None, ge=1)


class ProgramRead(BaseSchema):
    program_id: int
    department_id: int
    program_name: str
    program_code: str
    duration_years: int
    created_at: datetime
    updated_at: datetime
