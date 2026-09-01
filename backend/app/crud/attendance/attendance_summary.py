from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.attendance.attendance_summary import (
    AttendanceSummary,
)
from app.schemas.attendance.attendance_summary import (
    AttendanceSummaryCreate,
    AttendanceSummaryUpdate,
)


class CRUDAttendanceSummary(
    CRUDBase[
        AttendanceSummary,
        AttendanceSummaryCreate,
        AttendanceSummaryUpdate,
    ]
):
    def get_by_session(
        self,
        db: Session,
        *,
        attendance_session_id: int,
    ) -> AttendanceSummary | None:
        statement = select(AttendanceSummary).where(
            AttendanceSummary.attendance_session_id
            == attendance_session_id
        )

        return db.scalar(statement)


attendance_summary = CRUDAttendanceSummary(
    AttendanceSummary
)
