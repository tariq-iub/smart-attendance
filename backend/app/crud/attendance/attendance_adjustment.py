from app.crud.base import CRUDBase
from app.models.attendance.attendance_adjustment import AttendanceAdjustment
from app.schemas.attendance.attendance_adjustment import (
    AttendanceAdjustmentCreate,
    AttendanceAdjustmentUpdate,
)


class CRUDAttendanceAdjustment(
    CRUDBase[
        AttendanceAdjustment,
        AttendanceAdjustmentCreate,
        AttendanceAdjustmentUpdate,
    ]
):
    pass


attendance_adjustment = CRUDAttendanceAdjustment(AttendanceAdjustment)