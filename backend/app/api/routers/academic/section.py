from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.academic.section import SectionCreate, SectionRead, SectionUpdate
from app.services.academic.section import section_service

router = APIRouter(prefix="/sections", tags=["Academic - Sections"])


@router.post("/", response_model=SectionRead, status_code=status.HTTP_201_CREATED)
def create_section(data: SectionCreate, db: Session = Depends(get_db)):
    return section_service.create(db, data)


@router.get("/{section_id}", response_model=SectionRead)
def get_section(section_id: int, db: Session = Depends(get_db)):
    return section_service.get(db, section_id)


@router.get("/", response_model=list[SectionRead])
def list_sections(db: Session = Depends(get_db)):
    return section_service.get_all(db)


@router.put("/{section_id}", response_model=SectionRead)
def update_section(
    section_id: int,
    data: SectionUpdate,
    db: Session = Depends(get_db),
):
    return section_service.update(db, section_id, data)


@router.delete("/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_section(section_id: int, db: Session = Depends(get_db)):
    section_service.delete(db, section_id)
