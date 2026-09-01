from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.academic.enrollment import Enrollment
from app.schemas.academic.enrollment import EnrollmentCreate, EnrollmentUpdate


class CRUDEnrollment(
    CRUDBase[Enrollment, EnrollmentCreate, EnrollmentUpdate]
):
    def get_by_student(
        self,
        db: Session,
        *,
        student_id: int,
    ) -> list[Enrollment]:
        statement = select(Enrollment).where(
            Enrollment.student_id == student_id
        )
        return list(db.scalars(statement).all())

    def get_by_section(
        self,
        db: Session,
        *,
        section_id: int,
    ) -> list[Enrollment]:
        statement = select(Enrollment).where(
            Enrollment.section_id == section_id
        )
        return list(db.scalars(statement).all())

    def get_by_student_and_section(
        self,
        db: Session,
        *,
        student_id: int,
        section_id: int,
    ) -> Enrollment | None:
        statement = select(Enrollment).where(
            Enrollment.student_id == student_id,
            Enrollment.section_id == section_id,
        )
        return db.scalar(statement)


enrollment = CRUDEnrollment(Enrollment)
