from datetime import date, datetime

from pydantic import Field

from app.schemas.base import BaseSchema


class FaceRegistrationCreate(BaseSchema):
    student_id: int
    registration_date: date
    total_images: int = Field(default=5, ge=1)
    registration_status: str = Field(min_length=1, max_length=20)
    remarks: str | None = None


class FaceRegistrationUpdate(BaseSchema):
    registration_date: date | None = None
    total_images: int | None = Field(default=None, ge=1)
    registration_status: str | None = Field(
        default=None,
        max_length=20,
    )
    remarks: str | None = None


class FaceRegistrationRead(BaseSchema):
    registration_id: int
    student_id: int
    registration_date: date
    total_images: int
    registration_status: str
    remarks: str | None
    created_at: datetime
    updated_at: datetime
