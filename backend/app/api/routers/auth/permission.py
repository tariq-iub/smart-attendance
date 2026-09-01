from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.auth.permission import (
    PermissionCreate,
    PermissionRead,
    PermissionUpdate,
)
from app.services.auth.permission import PermissionService

router = APIRouter(prefix="/permissions", tags=["Auth - Permissions"])


@router.get("/", response_model=list[PermissionRead])
def list_permissions(db: Session = Depends(get_db)):
    return PermissionService(db).list_permissions()


@router.get("/{permission_id}", response_model=PermissionRead)
def get_permission(
    permission_id: int,
    db: Session = Depends(get_db),
):
    permission = PermissionService(db).get_permission(permission_id)

    if permission is None:
        raise HTTPException(
            status_code=404,
            detail="Permission not found",
        )

    return permission


@router.post(
    "/",
    response_model=PermissionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_permission(
    data: PermissionCreate,
    db: Session = Depends(get_db),
):
    return PermissionService(db).create_permission(data)


@router.put(
    "/{permission_id}",
    response_model=PermissionRead,
)
def update_permission(
    permission_id: int,
    data: PermissionUpdate,
    db: Session = Depends(get_db),
):
    permission = PermissionService(db).update_permission(
        permission_id,
        data,
    )

    if permission is None:
        raise HTTPException(
            status_code=404,
            detail="Permission not found",
        )

    return permission


@router.delete(
    "/{permission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_permission(
    permission_id: int,
    db: Session = Depends(get_db),
):
    result = PermissionService(db).delete_permission(permission_id)

    if result is False:
        raise HTTPException(
            status_code=404,
            detail="Permission not found",
        )
