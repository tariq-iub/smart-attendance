from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.auth.login_audit import LoginAudit
from app.schemas.auth.login_audit import LoginAuditCreate


class CRUDLoginAudit(
    CRUDBase[
        LoginAudit,
        LoginAuditCreate,
        LoginAuditCreate,
    ]
):
    def get_by_user(
        self,
        db: Session,
        *,
        user_id: int,
    ) -> list[LoginAudit]:
        statement = (
            select(LoginAudit)
            .where(LoginAudit.user_id == user_id)
            .order_by(LoginAudit.login_time.desc())
        )

        return list(db.scalars(statement).all())

    def get_recent(
        self,
        db: Session,
        *,
        limit: int = 100,
    ) -> list[LoginAudit]:
        statement = (
            select(LoginAudit)
            .order_by(LoginAudit.login_time.desc())
            .limit(limit)
        )

        return list(db.scalars(statement).all())


login_audit = CRUDLoginAudit(LoginAudit)
