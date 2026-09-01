from pydantic import Field

from app.schemas.base import BaseSchema


class IDListSchema(BaseSchema):
    ids: list[int] = Field(default_factory=list)


class StatusSchema(BaseSchema):
    status: str = Field(min_length=1, max_length=30)
