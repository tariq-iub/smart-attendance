from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.academic.teacher import teacher
from app.models.academic.teacher import Teacher
from app.services.base import ServiceBase


class TeacherService(ServiceBase):

    def __init__(self, db: Session | None = None) -> None:
        super().__init__(db=db, crud=teacher)

    def create(self, db: Session, obj_in: Any):
        # Automatically set required timestamps before inserting.
        now = datetime.utcnow()

        if hasattr(obj_in, "created_at"):
            obj_in.created_at = now

        if hasattr(obj_in, "updated_at"):
            obj_in.updated_at = now

        return self.crud.create(
            db,
            obj_in,
        )

    def get(self, db: Session, teacher_id: int):
        return self.crud.get(
            db,
            teacher_id,
        )

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
    ):
        statement = (
            select(Teacher)
            .offset(skip)
            .limit(limit)
        )

        return list(db.scalars(statement).all())

    def update(
        self,
        db: Session,
        teacher_id: int,
        obj_in: Any,
    ):
        db_obj = self.crud.get(
            db,
            teacher_id,
        )

        if db_obj is None:
            return None

        # Keep updated_at current whenever a teacher is modified.
        if hasattr(obj_in, "updated_at"):
            obj_in.updated_at = datetime.utcnow()

        return self.crud.update(
            db,
            db_obj,
            obj_in,
        )

    def delete(
        self,
        db: Session,
        teacher_id: int,
    ):
        return self.crud.remove(
            db,
            teacher_id,
        )


teacher_service = TeacherService()