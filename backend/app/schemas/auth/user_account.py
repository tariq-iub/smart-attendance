from datetime import datetime

from pydantic import EmailStr, Field

from app.schemas.base import BaseSchema


class UserAccountBase(BaseSchema):
    username: str = Field(min_length=1, max_length=50)
    email: EmailStr
    is_active: bool = True


class UserAccountCreate(UserAccountBase):
    password: str = Field(min_length=8, max_length=128)


class UserAccountUpdate(BaseSchema):
    username: str | None = Field(default=None, min_length=1, max_length=50)
    email: EmailStr | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserAccountRead(UserAccountBase):
    user_id: int
    last_login: datetime | None = None
    created_at: datetime
    updated_at: datetime
