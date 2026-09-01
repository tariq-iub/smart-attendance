from typing import Any

from sqlalchemy.orm import Session

from app.crud.auth.login_audit import login_audit
from app.services.base import ServiceBase


class LoginAuditService(ServiceBase):

    def __init__(self, db: Session) -> None:
        super().__init__(db=db, crud=login_audit)

    def get_audit(self, login_audit_id: int):
        return self.crud.get(self.db, login_audit_id)

    def list_audits(self, skip: int = 0, limit: int = 100):
        return self.crud.get_multi(self.db, skip=skip, limit=limit)

    def record_login(self, obj_in: Any):
        return self.crud.create(self.db, obj_in)

    def update_audit(self, login_audit_id: int, obj_in: Any):
        db_obj = self.crud.get(self.db, login_audit_id)
        if db_obj is None:
            return None
        return self.crud.update(self.db, db_obj, obj_in)
