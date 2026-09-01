from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.academic.department import (
    DepartmentCreate,
    DepartmentRead,
    DepartmentUpdate,
)
from app.services.academic.department import department_service

router = APIRouter(prefix="/departments", tags=["Academic - Departments"])


@router.post("/", response_model=DepartmentRead, status_code=status.HTTP_201_CREATED)
def create_department(
    data: DepartmentCreate,
    db: Session = Depends(get_db),
):
    return department_service.create(db, data)


@router.get("/{department_id}", response_model=DepartmentRead)
def get_department(
    department_id: int,
    db: Session = Depends(get_db),
):
    return department_service.get(db, department_id)


@router.get("/", response_model=list[DepartmentRead])
def list_departments(db: Session = Depends(get_db)):
    return department_service.get_all(db)


@router.put("/{department_id}", response_model=DepartmentRead)
def update_department(
    department_id: int,
    data: DepartmentUpdate,
    db: Session = Depends(get_db),
):
    return department_service.update(db, department_id, data)


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
):
    department_service.delete(db, department_id)


