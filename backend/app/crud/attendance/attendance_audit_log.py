from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.attendance.attendance_audit_log import (
    AttendanceAuditLog,
)
from app.schemas.attendance.attendance_audit_log import (
    AttendanceAuditLogCreate,
)


class CRUDAttendanceAuditLog(
    CRUDBase[
        AttendanceAuditLog,
        AttendanceAuditLogCreate,
        AttendanceAuditLogCreate,
    ]
):
    def get_by_attendance(
        self,
        db: Session,
        *,
        attendance_id: int,
    ) -> list[AttendanceAuditLog]:
        statement = (
            select(AttendanceAuditLog)
            .where(
                AttendanceAuditLog.attendance_id
                == attendance_id
            )
            .order_by(
                AttendanceAuditLog.action_time.desc()
            )
        )

        return list(db.scalars(statement).all())


attendance_audit_log = CRUDAttendanceAuditLog(
    AttendanceAuditLog
)
