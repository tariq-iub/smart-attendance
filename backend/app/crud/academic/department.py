from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.academic.department import Department
from app.schemas.academic.department import DepartmentCreate, DepartmentUpdate


class CRUDDepartment(
    CRUDBase[Department, DepartmentCreate, DepartmentUpdate]
):
    def get_by_code(
        self,
        db: Session,
        *,
        department_code: str,
    ) -> Department | None:
        statement = select(Department).where(
            Department.department_code == department_code
        )
        return db.scalar(statement)

    def get_by_name(
        self,
        db: Session,
        *,
        department_name: str,
    ) -> Department | None:
        statement = select(Department).where(
            Department.department_name == department_name
        )
        return db.scalar(statement)


department = CRUDDepartment(Department)
