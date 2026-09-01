from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.auth.role import Role
from app.schemas.auth.role import RoleCreate, RoleUpdate


class CRUDRole(
    CRUDBase[Role, RoleCreate, RoleUpdate]
):
    def get_by_name(
        self,
        db: Session,
        *,
        role_name: str,
    ) -> Role | None:
        statement = select(Role).where(
            Role.role_name == role_name
        )
        return db.scalar(statement)


role = CRUDRole(Role)
