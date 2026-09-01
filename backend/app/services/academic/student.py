from typing import Any

from sqlalchemy.orm import Session

from app.crud.academic.student import student
from app.services.base import ServiceBase


class StudentService(ServiceBase):

    def __init__(self, db: Session) -> None:
        super().__init__(
            db=db,
            crud=student,
        )

    def get_all(self, skip: int = 0, limit: int = 100):
        return self.crud.get_multi(
            self.db,
            skip=skip,
            limit=limit,
        )

    def get(self, student_id: int):
        return self.crud.get(
            self.db,
            student_id,
        )

    def create(self, obj_in: Any):
        return self.crud.create(
            self.db,
            obj_in,
        )

    def update(
        self,
        student_id: int,
        obj_in: Any,
    ):
        db_obj = self.crud.get(
            self.db,
            student_id,
        )

        if db_obj is None:
            return None

        return self.crud.update(
            self.db,
            db_obj,
            obj_in,
        )

    def delete(self, student_id: int):
        return self.crud.remove(
            self.db,
            student_id,
        )