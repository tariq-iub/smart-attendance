from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.auth.user_account import UserAccount
from app.schemas.auth.user_account import UserAccountCreate, UserAccountUpdate


class CRUDUserAccount(
    CRUDBase[UserAccount, UserAccountCreate, UserAccountUpdate]
):
    def get_by_username(
        self,
        db: Session,
        *,
        username: str,
    ) -> UserAccount | None:
        statement = select(UserAccount).where(
            UserAccount.username == username
        )
        return db.scalar(statement)

    def get_by_email(
        self,
        db: Session,
        *,
        email: str,
    ) -> UserAccount | None:
        statement = select(UserAccount).where(
            UserAccount.email == email
        )
        return db.scalar(statement)


user_account = CRUDUserAccount(UserAccount)
