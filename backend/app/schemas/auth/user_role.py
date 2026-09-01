from datetime import datetime

from app.schemas.base import BaseSchema


class UserRoleCreate(BaseSchema):
    user_id: int
    role_id: int
    assigned_by: int | None = None


class UserRoleRead(UserRoleCreate):
    user_role_id: int
    assigned_at: datetime
    created_at: datetime
    created_by: int
