from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.academic.enrollment import (
    EnrollmentCreate,
    EnrollmentRead,
    EnrollmentUpdate,
)
from app.services.academic.enrollment import enrollment_service

router = APIRouter(prefix="/enrollments", tags=["Academic - Enrollments"])


@router.post("/", response_model=EnrollmentRead, status_code=status.HTTP_201_CREATED)
def create_enrollment(data: EnrollmentCreate, db: Session = Depends(get_db)):
    return enrollment_service.create(db, data)


@router.get("/{enrollment_id}", response_model=EnrollmentRead)
def get_enrollment(enrollment_id: int, db: Session = Depends(get_db)):
    return enrollment_service.get(db, enrollment_id)


@router.get("/", response_model=list[EnrollmentRead])
def list_enrollments(db: Session = Depends(get_db)):
    return enrollment_service.get_all(db)


@router.put("/{enrollment_id}", response_model=EnrollmentRead)
def update_enrollment(
    enrollment_id: int,
    data: EnrollmentUpdate,
    db: Session = Depends(get_db),
):
    return enrollment_service.update(db, enrollment_id, data)


@router.delete("/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_enrollment(enrollment_id: int, db: Session = Depends(get_db)):
    enrollment_service.delete(db, enrollment_id)
