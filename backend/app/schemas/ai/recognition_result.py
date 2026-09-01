from datetime import datetime
from decimal import Decimal

from pydantic import Field

from app.schemas.base import BaseSchema


class RecognitionResultCreate(BaseSchema):
    recognition_session_id: int
    student_id: int
    confidence_score: Decimal = Field(ge=0, le=100)
    attendance_status: str = Field(min_length=1, max_length=20)
    processing_time: int = Field(default=0, ge=0)


class RecognitionResultUpdate(BaseSchema):
    confidence_score: Decimal | None = Field(
        default=None,
        ge=0,
        le=100,
    )
    attendance_status: str | None = Field(
        default=None,
        max_length=20,
    )
    processing_time: int | None = Field(default=None, ge=0)


class RecognitionResultRead(BaseSchema):
    result_id: int
    recognition_session_id: int
    student_id: int
    confidence_score: Decimal
    attendance_status: str
    processing_time: int
    created_at: datetime
    updated_at: datetime
