from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.auth.permission import Permission
from app.schemas.auth.permission import PermissionCreate, PermissionUpdate


class CRUDPermission(
    CRUDBase[Permission, PermissionCreate, PermissionUpdate]
):
    def get_by_name(
        self,
        db: Session,
        *,
        permission_name: str,
    ) -> Permission | None:
        statement = select(Permission).where(
            Permission.permission_name == permission_name
        )
        return db.scalar(statement)


permission = CRUDPermission(Permission)
