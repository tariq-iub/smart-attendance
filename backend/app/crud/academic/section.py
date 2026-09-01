from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.academic.section import Section
from app.schemas.academic.section import SectionCreate, SectionUpdate


class CRUDSection(
    CRUDBase[Section, SectionCreate, SectionUpdate]
):
    def get_by_course(
        self,
        db: Session,
        *,
        course_id: int,
    ) -> list[Section]:
        statement = select(Section).where(
            Section.course_id == course_id
        )
        return list(db.scalars(statement).all())

    def get_by_teacher(
        self,
        db: Session,
        *,
        teacher_id: int,
    ) -> list[Section]:
        statement = select(Section).where(
            Section.teacher_id == teacher_id
        )
        return list(db.scalars(statement).all())


section = CRUDSection(Section)
