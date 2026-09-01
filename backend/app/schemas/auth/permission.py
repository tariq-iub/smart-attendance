from datetime import datetime

from pydantic import Field

from app.schemas.base import BaseSchema


class PermissionBase(BaseSchema):
    permission_name: str = Field(min_length=1, max_length=100)
    permission_description: str | None = Field(default=None, max_length=255)


class PermissionCreate(PermissionBase):
    pass


class PermissionUpdate(BaseSchema):
    permission_name: str | None = Field(default=None, min_length=1, max_length=100)
    permission_description: str | None = Field(default=None, max_length=255)


class PermissionRead(PermissionBase):
    permission_id: int
    created_at: datetime
    updated_at: datetime
