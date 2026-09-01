from typing import Any

from sqlalchemy.orm import Session

from app.crud.attendance.attendance_summary import attendance_summary
from app.services.base import ServiceBase


class AttendanceSummaryService(ServiceBase):

    def __init__(self, db: Session) -> None:
        super().__init__(db=db, crud=attendance_summary)

    def get_summary(self, attendance_summary_id: int):
        return self.crud.get(self.db, attendance_summary_id)

    def list_summaries(self, skip: int = 0, limit: int = 100):
        return self.crud.get_multi(self.db, skip=skip, limit=limit)

    def create_summary(self, obj_in: Any):
        return self.crud.create(self.db, obj_in)

    def update_summary(
        self,
        attendance_summary_id: int,
        obj_in: Any,
    ):
        db_obj = self.crud.get(self.db, attendance_summary_id)
        if db_obj is None:
            return None
        return self.crud.update(self.db, db_obj, obj_in)

    def delete_summary(self, attendance_summary_id: int):
        return self.crud.remove(self.db, attendance_summary_id)


attendance_summary_service = AttendanceSummaryService(attendance_summary)
