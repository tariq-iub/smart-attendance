from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.auth.user_role import UserRoleCreate, UserRoleRead
from app.services.auth.user_role import UserRoleService

router = APIRouter(prefix="/user-roles", tags=["Auth - User Roles"])


@router.get("/", response_model=list[UserRoleRead])
def list_user_roles(db: Session = Depends(get_db)):
    return UserRoleService(db).list_user_roles()


@router.get("/{user_role_id}", response_model=UserRoleRead)
def get_user_role(
    user_role_id: int,
    db: Session = Depends(get_db),
):
    user_role = UserRoleService(db).get_user_role(user_role_id)

    if user_role is None:
        raise HTTPException(
            status_code=404,
            detail="User role not found",
        )

    return user_role


@router.post(
    "/",
    response_model=UserRoleRead,
    status_code=status.HTTP_201_CREATED,
)
def assign_role(
    data: UserRoleCreate,
    db: Session = Depends(get_db),
):
    return UserRoleService(db).assign_role(data)


@router.delete(
    "/{user_role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_role(
    user_role_id: int,
    db: Session = Depends(get_db),
):
    result = UserRoleService(db).remove_role(user_role_id)

    if result is False:
        raise HTTPException(
            status_code=404,
            detail="User role not found",
        )
