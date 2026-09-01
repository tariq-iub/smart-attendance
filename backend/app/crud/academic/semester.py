from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.academic.semester import Semester
from app.schemas.academic.semester import SemesterCreate, SemesterUpdate


class CRUDSemester(
    CRUDBase[Semester, SemesterCreate, SemesterUpdate]
):
    def get_by_program(
        self,
        db: Session,
        *,
        program_id: int,
    ) -> list[Semester]:
        statement = select(Semester).where(
            Semester.program_id == program_id
        )
        return list(db.scalars(statement).all())


semester = CRUDSemester(Semester)
