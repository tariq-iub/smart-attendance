from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.attendance.attendance_session import AttendanceSession
from app.schemas.attendance.attendance_session import (
    AttendanceSessionCreate,
    AttendanceSessionUpdate,
)


class CRUDAttendanceSession(
    CRUDBase[
        AttendanceSession,
        AttendanceSessionCreate,
        AttendanceSessionUpdate,
    ]
):

    def get_by_section(
        self,
        db: Session,
        *,
        section_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> list[AttendanceSession]:

        statement = (
            select(AttendanceSession)
            .where(
                AttendanceSession.section_id
                == section_id
            )
            .order_by(
                AttendanceSession.session_date.desc(),
                AttendanceSession.start_time.desc(),
            )
            .offset(skip)
            .limit(limit)
        )

        return list(
            db.scalars(statement).all()
        )

    def get_by_teacher(
        self,
        db: Session,
        *,
        teacher_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> list[AttendanceSession]:

        statement = (
            select(AttendanceSession)
            .where(
                AttendanceSession.teacher_id
                == teacher_id
            )
            .order_by(
                AttendanceSession.session_date.desc(),
                AttendanceSession.start_time.desc(),
            )
            .offset(skip)
            .limit(limit)
        )

        return list(
            db.scalars(statement).all()
        )

    def get_active_by_section(
        self,
        db: Session,
        *,
        section_id: int,
    ) -> AttendanceSession | None:

        statement = (
            select(AttendanceSession)
            .where(
                AttendanceSession.section_id
                == section_id,
                AttendanceSession.session_status
                == "ACTIVE",
            )
            .order_by(
                AttendanceSession.attendance_session_id.desc()
            )
        )

        return db.scalar(statement)


attendance_session = CRUDAttendanceSession(
    AttendanceSession
)