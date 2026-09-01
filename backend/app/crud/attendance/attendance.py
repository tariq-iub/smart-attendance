from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.attendance.attendance import Attendance
from app.schemas.attendance.attendance import (
    AttendanceCreate,
    AttendanceUpdate,
)


class CRUDAttendance(
    CRUDBase[Attendance, AttendanceCreate, AttendanceUpdate]
):

    def get_all(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Attendance]:
        statement = (
            select(Attendance)
            .offset(skip)
            .limit(limit)
        )

        return list(db.scalars(statement).all())

    def get_by_session(
        self,
        db: Session,
        *,
        attendance_session_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Attendance]:
        statement = (
            select(Attendance)
            .where(
                Attendance.attendance_session_id
                == attendance_session_id
            )
            .offset(skip)
            .limit(limit)
        )

        return list(db.scalars(statement).all())

    def get_by_student(
        self,
        db: Session,
        *,
        student_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Attendance]:
        statement = (
            select(Attendance)
            .where(
                Attendance.student_id == student_id
            )
            .order_by(
                Attendance.check_in_time.desc()
            )
            .offset(skip)
            .limit(limit)
        )

        return list(db.scalars(statement).all())

    def get_by_session_and_student(
        self,
        db: Session,
        *,
        attendance_session_id: int,
        student_id: int,
    ) -> Attendance | None:
        statement = (
            select(Attendance)
            .where(
                Attendance.attendance_session_id
                == attendance_session_id,
                Attendance.student_id == student_id,
            )
        )

        return db.scalar(statement)


attendance = CRUDAttendance(Attendance)