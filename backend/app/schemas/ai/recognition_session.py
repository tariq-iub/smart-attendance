from datetime import datetime

from pydantic import Field

from app.schemas.base import BaseSchema


class RecognitionSessionCreate(BaseSchema):
    attendance_session_id: int
    camera_name: str | None = Field(default=None, max_length=100)
    location: str | None = Field(default=None, max_length=100)
    total_faces_detected: int = Field(default=0, ge=0)
    total_faces_recognized: int = Field(default=0, ge=0)
    started_at: datetime


class RecognitionSessionUpdate(BaseSchema):
    camera_name: str | None = Field(default=None, max_length=100)
    location: str | None = Field(default=None, max_length=100)
    total_faces_detected: int | None = Field(default=None, ge=0)
    total_faces_recognized: int | None = Field(default=None, ge=0)
    ended_at: datetime | None = None


class RecognitionSessionRead(BaseSchema):
    recognition_session_id: int
    attendance_session_id: int
    camera_name: str | None
    location: str | None
    total_faces_detected: int
    total_faces_recognized: int
    started_at: datetime
    ended_at: datetime | None
    created_at: datetime
    updated_at: datetime
