from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.attendance.attendance_audit_log import (
    AttendanceAuditLogCreate,
    AttendanceAuditLogRead,
)
from app.services.attendance.attendance_audit_log import (
    attendance_audit_log_service,
)

router = APIRouter(
    prefix="/attendance-audit-logs",
    tags=["Attendance - Audit Logs"],
)


@router.post(
    "/",
    response_model=AttendanceAuditLogRead,
    status_code=status.HTTP_201_CREATED,
)
def create_attendance_audit_log(
    data: AttendanceAuditLogCreate,
    db: Session = Depends(get_db),
):
    return attendance_audit_log_service.create(db, data)


@router.get(
    "/{attendance_audit_log_id}",
    response_model=AttendanceAuditLogRead,
)
def get_attendance_audit_log(
    attendance_audit_log_id: int,
    db: Session = Depends(get_db),
):
    return attendance_audit_log_service.get(
        db,
        attendance_audit_log_id,
    )


@router.get(
    "/",
    response_model=list[AttendanceAuditLogRead],
)
def list_attendance_audit_logs(db: Session = Depends(get_db)):
    return attendance_audit_log_service.get_all(db)
