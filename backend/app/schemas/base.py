from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        extra="forbid",
    )


class IDSchema(BaseSchema):
    id: int


class TimestampSchema(BaseSchema):
    created_at: datetime
    updated_at: datetime


class DateRangeSchema(BaseSchema):
    start_date: date | None = None
    end_date: date | None = None


class MessageSchema(BaseSchema):
    message: str


class PaginationSchema(BaseSchema):
    page: int = 1
    page_size: int = 20


class ErrorDetailSchema(BaseSchema):
    detail: str
    code: str | None = None
    metadata: dict[str, Any] | None = None
