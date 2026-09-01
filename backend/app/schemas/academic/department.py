from datetime import datetime

from pydantic import Field

from app.schemas.base import BaseSchema


class DepartmentCreate(BaseSchema):
    department_name: str = Field(min_length=1, max_length=100)
    department_code: str = Field(min_length=1, max_length=20)


class DepartmentUpdate(BaseSchema):
    department_name: str | None = Field(default=None, max_length=100)
    department_code: str | None = Field(default=None, max_length=20)


class DepartmentRead(BaseSchema):
    department_id: int
    department_name: str
    department_code: str
    created_at: datetime
    updated_at: datetime
