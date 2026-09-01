from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.academic.student import Student
from app.schemas.academic.student import StudentCreate, StudentUpdate


class CRUDStudent(
    CRUDBase[Student, StudentCreate, StudentUpdate]
):
    def get_by_program(
        self,
        db: Session,
        *,
        program_id: int,
    ) -> list[Student]:
        statement = select(Student).where(
            Student.program_id == program_id
        )
        return list(db.scalars(statement).all())

    def get_by_semester(
        self,
        db: Session,
        *,
        semester_id: int,
    ) -> list[Student]:
        statement = select(Student).where(
            Student.semester_id == semester_id
        )
        return list(db.scalars(statement).all())


student = CRUDStudent(Student)
