from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.academic.teacher import Teacher
from app.schemas.academic.teacher import TeacherCreate, TeacherUpdate


class CRUDTeacher(
    CRUDBase[Teacher, TeacherCreate, TeacherUpdate]
):
    def get_by_department(
        self,
        db: Session,
        *,
        department_id: int,
    ) -> list[Teacher]:
        statement = select(Teacher).where(
            Teacher.department_id == department_id
        )
        return list(db.scalars(statement).all())


teacher = CRUDTeacher(Teacher)
