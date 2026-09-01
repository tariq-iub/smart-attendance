from typing import Any

from sqlalchemy.orm import Session

from app.crud.auth.permission import permission
from app.services.base import ServiceBase


class PermissionService(ServiceBase):

    def __init__(self, db: Session) -> None:
        super().__init__(db=db, crud=permission)

    def get_permission(self, permission_id: int):
        return self.crud.get(self.db, permission_id)

    def list_permissions(self, skip: int = 0, limit: int = 100):
        return self.crud.get_multi(self.db, skip=skip, limit=limit)

    def create_permission(self, obj_in: Any):
        return self.crud.create(self.db, obj_in)

    def update_permission(self, permission_id: int, obj_in: Any):
        db_obj = self.crud.get(self.db, permission_id)
        if db_obj is None:
            return None
        return self.crud.update(self.db, db_obj, obj_in)

    def delete_permission(self, permission_id: int):
        return self.crud.remove(self.db, permission_id)
