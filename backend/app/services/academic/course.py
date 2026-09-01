from datetime import datetime

from sqlalchemy.orm import Session

from app.crud.academic.course import course
from app.models.academic.course import Course


class CourseService:

    def create(self, db: Session, data):
        now = datetime.now()

        values = data.model_dump()

        values["created_at"] = now
        values["updated_at"] = now

        db_obj = Course(**values)

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        return db_obj

    def get(self, db: Session, course_id: int):
        return course.get(db, course_id)

    def get_all(self, db: Session):
        return course.get_multi(db)

    def update(self, db: Session, course_id: int, data):
        db_obj = course.get(db, course_id)

        if db_obj is None:
            return None

        values = data.model_dump(exclude_unset=True)

        values["updated_at"] = datetime.now()

        for field, value in values.items():
            setattr(db_obj, field, value)

        db.commit()
        db.refresh(db_obj)

        return db_obj

    def delete(self, db: Session, course_id: int):
        db_obj = course.get(db, course_id)

        if db_obj is None:
            return None

        db.delete(db_obj)
        db.commit()

        return db_obj


course_service = CourseService()