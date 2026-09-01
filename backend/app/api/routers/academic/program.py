from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.academic.program import ProgramCreate, ProgramRead, ProgramUpdate
from app.services.academic.program import program_service

router = APIRouter(prefix="/programs", tags=["Academic - Programs"])


@router.post("/", response_model=ProgramRead, status_code=status.HTTP_201_CREATED)
def create_program(data: ProgramCreate, db: Session = Depends(get_db)):
    return program_service.create(db, data)


@router.get("/{program_id}", response_model=ProgramRead)
def get_program(program_id: int, db: Session = Depends(get_db)):
    return program_service.get(db, program_id)


@router.get("/", response_model=list[ProgramRead])
def list_programs(db: Session = Depends(get_db)):
    return program_service.get_all(db)


@router.put("/{program_id}", response_model=ProgramRead)
def update_program(
    program_id: int,
    data: ProgramUpdate,
    db: Session = Depends(get_db),
):
    return program_service.update(db, program_id, data)


@router.delete("/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_program(program_id: int, db: Session = Depends(get_db)):
    program_service.delete(db, program_id)
