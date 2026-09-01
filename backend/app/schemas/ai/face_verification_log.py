from datetime import datetime
from decimal import Decimal

from pydantic import Field

from app.schemas.base import BaseSchema


class FaceVerificationLogCreate(BaseSchema):
    student_id: int
    session_id: int
    confidence_score: Decimal = Field(ge=0, le=100)
    verification_result: str = Field(min_length=1, max_length=20)
    captured_image: str | None = None
    verified_at: datetime


class FaceVerificationLogUpdate(BaseSchema):
    confidence_score: Decimal | None = Field(
        default=None,
        ge=0,
        le=100,
    )
    verification_result: str | None = Field(
        default=None,
        max_length=20,
    )
    captured_image: str | None = None
    verified_at: datetime | None = None


class FaceVerificationLogRead(BaseSchema):
    verification_id: int
    student_id: int
    session_id: int
    confidence_score: Decimal
    verification_result: str
    captured_image: str | None
    verified_at: datetime
    created_at: datetime
    updated_at: datetime
