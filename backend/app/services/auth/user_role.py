from typing import Any

from sqlalchemy.orm import Session

from app.crud.auth.user_role import user_role
from app.services.base import ServiceBase


class UserRoleService(ServiceBase):

    def __init__(self, db: Session) -> None:
        super().__init__(db=db, crud=user_role)

    def get_user_role(self, user_role_id: int):
        return self.crud.get(self.db, user_role_id)

    def list_user_roles(self, skip: int = 0, limit: int = 100):
        return self.crud.get_multi(self.db, skip=skip, limit=limit)

    def assign_role(self, obj_in: Any):
        return self.crud.create(self.db, obj_in)

    def update_user_role(self, user_role_id: int, obj_in: Any):
        db_obj = self.crud.get(self.db, user_role_id)
        if db_obj is None:
            return None
        return self.crud.update(self.db, db_obj, obj_in)

    def remove_role(self, user_role_id: int):
        return self.crud.remove(self.db, user_role_id)
