from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.auth.role_permission import (
    RolePermissionCreate,
    RolePermissionRead,
)
from app.services.auth.role_permission import RolePermissionService

router = APIRouter(
    prefix="/role-permissions",
    tags=["Auth - Role Permissions"],
)


@router.get("/", response_model=list[RolePermissionRead])
def list_role_permissions(db: Session = Depends(get_db)):
    return RolePermissionService(db).list_role_permissions()


@router.get(
    "/{role_permission_id}",
    response_model=RolePermissionRead,
)
def get_role_permission(
    role_permission_id: int,
    db: Session = Depends(get_db),
):
    role_permission = RolePermissionService(db).get_role_permission(
        role_permission_id
    )

    if role_permission is None:
        raise HTTPException(
            status_code=404,
            detail="Role permission not found",
        )

    return role_permission


@router.post(
    "/",
    response_model=RolePermissionRead,
    status_code=status.HTTP_201_CREATED,
)
def grant_permission(
    data: RolePermissionCreate,
    db: Session = Depends(get_db),
):
    return RolePermissionService(db).grant_permission(data)


@router.delete(
    "/{role_permission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def revoke_permission(
    role_permission_id: int,
    db: Session = Depends(get_db),
):
    result = RolePermissionService(db).revoke_permission(
        role_permission_id
    )

    if result is False:
        raise HTTPException(
            status_code=404,
            detail="Role permission not found",
        )
