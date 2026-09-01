from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.auth.user_account import (
    UserAccountCreate,
    UserAccountRead,
    UserAccountUpdate,
)
from app.services.auth.user_account import UserAccountService

router = APIRouter(prefix="/users", tags=["Auth - Users"])


@router.get("/", response_model=list[UserAccountRead])
def list_users(db: Session = Depends(get_db)):
    return UserAccountService(db).list_users()


@router.get("/{user_id}", response_model=UserAccountRead)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = UserAccountService(db).get_user(user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


@router.post(
    "/",
    response_model=UserAccountRead,
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    data: UserAccountCreate,
    db: Session = Depends(get_db),
):
    return UserAccountService(db).create_user(data)


@router.put("/{user_id}", response_model=UserAccountRead)
def update_user(
    user_id: int,
    data: UserAccountUpdate,
    db: Session = Depends(get_db),
):
    user = UserAccountService(db).update_user(user_id, data)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
):
    result = UserAccountService(db).delete_user(user_id)

    if result is False:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
