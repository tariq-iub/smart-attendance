from datetime import datetime

from pydantic import Field

from app.schemas.base import BaseSchema


class RoleBase(BaseSchema):
    role_name: str = Field(min_length=1, max_length=100)
    role_description: str | None = Field(default=None, max_length=255)


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseSchema):
    role_name: str | None = Field(default=None, min_length=1, max_length=100)
    role_description: str | None = Field(default=None, max_length=255)


class RoleRead(RoleBase):
    role_id: int
    created_at: datetime
    updated_at: datetime
