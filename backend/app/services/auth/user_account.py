from typing import Any

from sqlalchemy.orm import Session

from app.crud.auth.user_account import user_account
from app.services.base import ServiceBase


class UserAccountService(ServiceBase):

    def __init__(self, db: Session) -> None:
        super().__init__(db=db, crud=user_account)

    def get_user(self, user_id: int):
        return self.crud.get(self.db, user_id)

    def list_users(self, skip: int = 0, limit: int = 100):
        return self.crud.get_multi(self.db, skip=skip, limit=limit)

    def create_user(self, obj_in: Any):
        return self.crud.create(self.db, obj_in)

    def update_user(self, user_id: int, obj_in: Any):
        db_obj = self.crud.get(self.db, user_id)
        if db_obj is None:
            return None
        return self.crud.update(self.db, db_obj, obj_in)

    def delete_user(self, user_id: int):
        return self.crud.remove(self.db, user_id)
