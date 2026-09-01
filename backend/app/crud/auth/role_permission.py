from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.auth.role_permission import RolePermission
from app.schemas.auth.role_permission import RolePermissionCreate


class CRUDRolePermission(
    CRUDBase[
        RolePermission,
        RolePermissionCreate,
        RolePermissionCreate,
    ]
):
    def get_by_role_and_permission(
        self,
        db: Session,
        *,
        role_id: int,
        permission_id: int,
    ) -> RolePermission | None:
        statement = select(RolePermission).where(
            RolePermission.role_id == role_id,
            RolePermission.permission_id == permission_id,
        )

        return db.scalar(statement)

    def get_by_role(
        self,
        db: Session,
        *,
        role_id: int,
    ) -> list[RolePermission]:
        statement = select(RolePermission).where(
            RolePermission.role_id == role_id
        )

        return list(db.scalars(statement).all())

    def get_by_permission(
        self,
        db: Session,
        *,
        permission_id: int,
    ) -> list[RolePermission]:
        statement = select(RolePermission).where(
            RolePermission.permission_id == permission_id
        )

        return list(db.scalars(statement).all())


role_permission = CRUDRolePermission(RolePermission)
