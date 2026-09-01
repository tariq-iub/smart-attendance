from datetime import datetime

from app.schemas.base import BaseSchema


class RolePermissionCreate(BaseSchema):
    role_id: int
    permission_id: int
    granted_by: int | None = None


class RolePermissionRead(RolePermissionCreate):
    role_permission_id: int
    granted_at: datetime
    created_at: datetime
    created_by: int
