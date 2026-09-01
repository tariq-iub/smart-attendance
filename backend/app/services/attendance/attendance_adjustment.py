from typing import Any

from sqlalchemy.orm import Session

from app.crud.attendance.attendance_adjustment import attendance_adjustment
from app.services.base import ServiceBase


class AttendanceAdjustmentService(ServiceBase):

    def __init__(self, db: Session) -> None:
        super().__init__(db=db, crud=attendance_adjustment)

    def get_adjustment(self, attendance_adjustment_id: int):
        return self.crud.get(self.db, attendance_adjustment_id)

    def list_adjustments(self, skip: int = 0, limit: int = 100):
        return self.crud.get_multi(self.db, skip=skip, limit=limit)

    def create_adjustment(self, obj_in: Any):
        return self.crud.create(self.db, obj_in)

    def update_adjustment(
        self,
        attendance_adjustment_id: int,
        obj_in: Any,
    ):
        db_obj = self.crud.get(self.db, attendance_adjustment_id)
        if db_obj is None:
            return None
        return self.crud.update(self.db, db_obj, obj_in)

    def delete_adjustment(self, attendance_adjustment_id: int):
        return self.crud.remove(self.db, attendance_adjustment_id)


attendance_adjustment_service = AttendanceAdjustmentService(attendance_adjustment)
