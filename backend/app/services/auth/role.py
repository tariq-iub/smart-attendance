from typing import Any

from sqlalchemy.orm import Session

from app.crud.auth.role import role
from app.services.base import ServiceBase


class RoleService(ServiceBase):

    def __init__(self, db: Session) -> None:
        super().__init__(db=db, crud=role)

    def get_role(self, role_id: int):
        return self.crud.get(self.db, role_id)

    def list_roles(self, skip: int = 0, limit: int = 100):
        return self.crud.get_multi(self.db, skip=skip, limit=limit)

    def create_role(self, obj_in: Any):
        return self.crud.create(self.db, obj_in)

    def update_role(self, role_id: int, obj_in: Any):
        db_obj = self.crud.get(self.db, role_id)
        if db_obj is None:
            return None
        return self.crud.update(self.db, db_obj, obj_in)

    def delete_role(self, role_id: int):
        return self.crud.remove(self.db, role_id)
