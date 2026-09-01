from typing import Any

from sqlalchemy.orm import Session

from app.crud.attendance.attendance_audit_log import attendance_audit_log
from app.services.base import ServiceBase


class AttendanceAuditLogService(ServiceBase):

    def __init__(self, db: Session) -> None:
        super().__init__(db=db, crud=attendance_audit_log)

    def get_audit_log(self, attendance_audit_log_id: int):
        return self.crud.get(self.db, attendance_audit_log_id)

    def list_audit_logs(self, skip: int = 0, limit: int = 100):
        return self.crud.get_multi(self.db, skip=skip, limit=limit)

    def create_audit_log(self, obj_in: Any):
        return self.crud.create(self.db, obj_in)

    def update_audit_log(
        self,
        attendance_audit_log_id: int,
        obj_in: Any,
    ):
        db_obj = self.crud.get(self.db, attendance_audit_log_id)
        if db_obj is None:
            return None
        return self.crud.update(self.db, db_obj, obj_in)

    def delete_audit_log(self, attendance_audit_log_id: int):
        return self.crud.remove(self.db, attendance_audit_log_id)


attendance_audit_log_service = AttendanceAuditLogService(attendance_audit_log)
