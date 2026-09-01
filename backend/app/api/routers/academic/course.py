from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.academic.course import (
    CourseCreate,
    CourseRead,
    CourseUpdate,
)
from app.services.academic.course import course_service


router = APIRouter(
    prefix="/courses",
    tags=["Academic - Courses"],
)


# ============================================================
# CREATE COURSE
# ============================================================

@router.post(
    "/",
    response_model=CourseRead,
    status_code=status.HTTP_201_CREATED,
)
def create_course(
    data: CourseCreate,
    db: Session = Depends(get_db),
):
    try:
        return course_service.create(db, data)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not create course: {str(e)}",
        )


# ============================================================
# LIST ALL COURSES
# ============================================================

@router.get(
    "/",
    response_model=list[CourseRead],
)
def list_courses(
    db: Session = Depends(get_db),
):
    return course_service.get_all(db)


# ============================================================
# GET SINGLE COURSE
# ============================================================

@router.get(
    "/{course_id}",
    response_model=CourseRead,
)
def get_course(
    course_id: int,
    db: Session = Depends(get_db),
):
    course = course_service.get(db, course_id)

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with ID {course_id} not found",
        )

    return course


# ============================================================
# UPDATE COURSE
# ============================================================

@router.put(
    "/{course_id}",
    response_model=CourseRead,
)
def update_course(
    course_id: int,
    data: CourseUpdate,
    db: Session = Depends(get_db),
):
    try:
        course = course_service.update(
            db,
            course_id,
            data,
        )

        if course is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {course_id} not found",
            )

        return course

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not update course: {str(e)}",
        )


# ============================================================
# DELETE COURSE
# ============================================================

@router.delete(
    "/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
):
    try:
        course = course_service.delete(
            db,
            course_id,
        )

        if course is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {course_id} not found",
            )

        return None

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not delete course: {str(e)}",
        )