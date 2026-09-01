from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.auth.role import RoleCreate, RoleRead, RoleUpdate
from app.services.auth.role import RoleService

router = APIRouter(prefix="/roles", tags=["Auth - Roles"])


@router.get("/", response_model=list[RoleRead])
def list_roles(db: Session = Depends(get_db)):
    return RoleService(db).list_roles()


@router.get("/{role_id}", response_model=RoleRead)
def get_role(role_id: int, db: Session = Depends(get_db)):
    role = RoleService(db).get_role(role_id)

    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")

    return role


@router.post(
    "/",
    response_model=RoleRead,
    status_code=status.HTTP_201_CREATED,
)
def create_role(
    data: RoleCreate,
    db: Session = Depends(get_db),
):
    return RoleService(db).create_role(data)


@router.put("/{role_id}", response_model=RoleRead)
def update_role(
    role_id: int,
    data: RoleUpdate,
    db: Session = Depends(get_db),
):
    role = RoleService(db).update_role(role_id, data)

    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")

    return role


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
):
    result = RoleService(db).delete_role(role_id)

    if result is False:
        raise HTTPException(status_code=404, detail="Role not found")
