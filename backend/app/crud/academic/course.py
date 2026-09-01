from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.academic.course import Course
from app.schemas.academic.course import CourseCreate, CourseUpdate


class CRUDCourse(
    CRUDBase[Course, CourseCreate, CourseUpdate]
):
    def get_by_program(
        self,
        db: Session,
        *,
        program_id: int,
    ) -> list[Course]:
        statement = select(Course).where(
            Course.program_id == program_id
        )
        return list(db.scalars(statement).all())

    def get_by_semester(
        self,
        db: Session,
        *,
        semester_id: int,
    ) -> list[Course]:
        statement = select(Course).where(
            Course.semester_id == semester_id
        )
        return list(db.scalars(statement).all())


course = CRUDCourse(Course)
