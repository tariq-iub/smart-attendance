from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.academic.semester import SemesterCreate, SemesterRead, SemesterUpdate
from app.services.academic.semester import semester_service

router = APIRouter(prefix="/semesters", tags=["Academic - Semesters"])


@router.post("/", response_model=SemesterRead, status_code=status.HTTP_201_CREATED)
def create_semester(data: SemesterCreate, db: Session = Depends(get_db)):
    return semester_service.create(db, data)


@router.get("/{semester_id}", response_model=SemesterRead)
def get_semester(semester_id: int, db: Session = Depends(get_db)):
    return semester_service.get(db, semester_id)


@router.get("/", response_model=list[SemesterRead])
def list_semesters(db: Session = Depends(get_db)):
    return semester_service.get_all(db)


@router.put("/{semester_id}", response_model=SemesterRead)
def update_semester(
    semester_id: int,
    data: SemesterUpdate,
    db: Session = Depends(get_db),
):
    return semester_service.update(db, semester_id, data)


@router.delete("/{semester_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_semester(semester_id: int, db: Session = Depends(get_db)):
    semester_service.delete(db, semester_id)
