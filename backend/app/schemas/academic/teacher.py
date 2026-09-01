from datetime import datetime

from pydantic import EmailStr, Field

from app.schemas.base import BaseSchema


class TeacherCreate(BaseSchema):
    department_id: int
    teacher_code: str = Field(min_length=1, max_length=20)
    first_name: str = Field(min_length=1, max_length=50)
    last_name: str = Field(min_length=1, max_length=50)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)
    designation: str = Field(min_length=1, max_length=50)
    is_active: bool = True


class TeacherUpdate(BaseSchema):
    department_id: int | None = None
    teacher_code: str | None = Field(default=None, max_length=20)
    first_name: str | None = Field(default=None, max_length=50)
    last_name: str | None = Field(default=None, max_length=50)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=20)
    designation: str | None = Field(default=None, max_length=50)
    is_active: bool | None = None


class TeacherRead(BaseSchema):
    teacher_id: int
    department_id: int
    teacher_code: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None
    designation: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
