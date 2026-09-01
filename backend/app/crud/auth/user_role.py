from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.auth.user_role import UserRole
from app.schemas.auth.user_role import UserRoleCreate


class CRUDUserRole(
    CRUDBase[
        UserRole,
        UserRoleCreate,
        UserRoleCreate,
    ]
):
    def get_by_user_and_role(
        self,
        db: Session,
        *,
        user_id: int,
        role_id: int,
    ) -> UserRole | None:
        statement = select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id,
        )

        return db.scalar(statement)

    def get_by_user(
        self,
        db: Session,
        *,
        user_id: int,
    ) -> list[UserRole]:
        statement = select(UserRole).where(
            UserRole.user_id == user_id
        )

        return list(db.scalars(statement).all())


user_role = CRUDUserRole(UserRole)
