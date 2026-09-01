from datetime import datetime

from pydantic import Field

from app.schemas.base import BaseSchema


class FaceEmbeddingCreate(BaseSchema):
    student_id: int
    embedding_vector: str
    model_name: str = Field(min_length=1, max_length=50)
    embedding_version: str | None = Field(
        default=None,
        max_length=20,
    )
    is_active: bool = True


class FaceEmbeddingUpdate(BaseSchema):
    embedding_vector: str | None = None
    model_name: str | None = Field(default=None, max_length=50)
    embedding_version: str | None = Field(
        default=None,
        max_length=20,
    )
    is_active: bool | None = None


class FaceEmbeddingRead(BaseSchema):
    embedding_id: int
    student_id: int
    embedding_vector: str
    model_name: str
    embedding_version: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
