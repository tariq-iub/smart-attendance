from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.academic.program import Program
from app.schemas.academic.program import ProgramCreate, ProgramUpdate


class CRUDProgram(
    CRUDBase[Program, ProgramCreate, ProgramUpdate]
):
    def get_by_code(
        self,
        db: Session,
        *,
        program_code: str,
    ) -> Program | None:
        statement = select(Program).where(
            Program.program_code == program_code
        )
        return db.scalar(statement)

    def get_by_department(
        self,
        db: Session,
        *,
        department_id: int,
    ) -> list[Program]:
        statement = select(Program).where(
            Program.department_id == department_id
        )
        return list(db.scalars(statement).all())


program = CRUDProgram(Program)
