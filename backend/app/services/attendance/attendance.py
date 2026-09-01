from typing import Any

from sqlalchemy.orm import Session

from app.crud.attendance.attendance import attendance
from app.services.base import ServiceBase


class AttendanceService(ServiceBase):

    def __init__(self, db: Session | None = None) -> None:
        super().__init__(
            db=db,
            crud=attendance,
        )

    def create(
        self,
        db: Session,
        obj_in: Any,
    ):
        return self.crud.create(
            db,
            obj_in,
        )

    def get(
        self,
        db: Session,
        attendance_id: int,
    ):
        return self.crud.get(
            db,
            attendance_id,
        )

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
    ):
        return self.crud.get_multi(
            db,
            skip=skip,
            limit=limit,
        )

    def update(
        self,
        db: Session,
        attendance_id: int,
        obj_in: Any,
    ):
        db_obj = self.crud.get(
            db,
            attendance_id,
        )

        if db_obj is None:
            return None

        return self.crud.update(
            db,
            db_obj,
            obj_in,
        )

    def delete(
        self,
        db: Session,
        attendance_id: int,
    ):
        return self.crud.remove(
            db,
            attendance_id,
        )


attendance_service = AttendanceService()