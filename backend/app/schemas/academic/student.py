from datetime import date, datetime

from pydantic import EmailStr, Field

from app.schemas.base import BaseSchema


class StudentCreate(BaseSchema):
    program_id: int
    semester_id: int
    registration_no: str = Field(min_length=1, max_length=30)
    first_name: str = Field(min_length=1, max_length=50)
    last_name: str = Field(min_length=1, max_length=50)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)
    gender: str = Field(min_length=1, max_length=10)
    date_of_birth: date | None = None
    admission_year: int = Field(ge=1900)
    current_status: str = Field(min_length=1, max_length=20)
    is_active: bool = True


class StudentUpdate(BaseSchema):
    program_id: int | None = None
    semester_id: int | None = None
    registration_no: str | None = Field(default=None, max_length=30)
    first_name: str | None = Field(default=None, max_length=50)
    last_name: str | None = Field(default=None, max_length=50)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=20)
    gender: str | None = Field(default=None, max_length=10)
    date_of_birth: date | None = None
    admission_year: int | None = Field(default=None, ge=1900)
    current_status: str | None = Field(default=None, max_length=20)
    is_active: bool | None = None


class StudentRead(BaseSchema):
    student_id: int
    program_id: int
    semester_id: int
    registration_no: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None
    gender: str
    date_of_birth: date | None
    admission_year: int
    current_status: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
