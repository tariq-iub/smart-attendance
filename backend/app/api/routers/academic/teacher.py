from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.api.dependencies import get_db
from app.schemas.academic.teacher import (
    TeacherCreate,
    TeacherRead,
    TeacherUpdate,
)
from app.services.academic.teacher import teacher_service
from app.services.academic.teacher import teacher_service


router = APIRouter(
    prefix="/teachers",
    tags=["Academic - Teachers"],
)


# ============================================================
# CREATE TEACHER
# ============================================================

@router.post(
    "/",
    response_model=TeacherRead,
    status_code=status.HTTP_201_CREATED,
)
def create_teacher(
    data: TeacherCreate,
    db: Session = Depends(get_db),
):
    return teacher_service.create(db, data)


# ============================================================
# LIST ALL TEACHERS
# ============================================================

@router.get(
    "/",
    response_model=list[TeacherRead],
)
def list_teachers(
    db: Session = Depends(get_db),
):
    return teacher_service.get_all(db)


# ============================================================
# GET SINGLE TEACHER
# ============================================================

@router.get(
    "/{teacher_id}",
    response_model=TeacherRead,
)
def get_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
):
    teacher = teacher_service.get(db, teacher_id)

    if teacher is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with ID {teacher_id} not found",
        )

    return teacher


# ============================================================
# UPDATE TEACHER
# ============================================================

@router.put(
    "/{teacher_id}",
    response_model=TeacherRead,
)
def update_teacher(
    teacher_id: int,
    data: TeacherUpdate,
    db: Session = Depends(get_db),
):
    teacher = teacher_service.update(
        db,
        teacher_id,
        data,
    )

    if teacher is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with ID {teacher_id} not found",
        )

    return teacher


# ============================================================
# DELETE TEACHER
# ============================================================

    # ============================================================
# DELETE TEACHER
# ============================================================

@router.delete(
    "/{teacher_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
):
    """
    Permanently delete a teacher and clean up dependent records.

    Deletion order:

    1. Attendance records
    2. Attendance sessions
    3. Academic sections
    4. Teacher

    This allows the frontend Delete button to work without
    requiring manual terminal/database commands.
    """

    try:
        # ----------------------------------------------------
        # 1. Check whether teacher exists
        # ----------------------------------------------------

        teacher = db.execute(
            text("""
                SELECT teacher_id
                FROM academic.teacher
                WHERE teacher_id = :teacher_id
            """),
            {
                "teacher_id": teacher_id
            },
        ).fetchone()

        if teacher is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with ID {teacher_id} not found",
            )

        # ----------------------------------------------------
        # 2. Delete attendance records belonging to the
        #    teacher's attendance sessions
        # ----------------------------------------------------

        db.execute(
            text("""
                DELETE FROM attendance.attendance
                WHERE attendance_session_id IN (
                    SELECT attendance_session_id
                    FROM attendance.attendance_session
                    WHERE teacher_id = :teacher_id
                )
            """),
            {
                "teacher_id": teacher_id
            },
        )

        # ----------------------------------------------------
        # 3. Delete attendance sessions belonging to teacher
        # ----------------------------------------------------

        db.execute(
            text("""
                DELETE FROM attendance.attendance_session
                WHERE teacher_id = :teacher_id
            """),
            {
                "teacher_id": teacher_id
            },
        )

        # ----------------------------------------------------
        # 4. Delete academic sections belonging to teacher
        # ----------------------------------------------------

        db.execute(
            text("""
                DELETE FROM academic.section
                WHERE teacher_id = :teacher_id
            """),
            {
                "teacher_id": teacher_id
            },
        )

        # ----------------------------------------------------
        # 5. Finally delete the teacher
        # ----------------------------------------------------

        db.execute(
            text("""
                DELETE FROM academic.teacher
                WHERE teacher_id = :teacher_id
            """),
            {
                "teacher_id": teacher_id
            },
        )

        # ----------------------------------------------------
        # 6. Commit everything
        # ----------------------------------------------------

        db.commit()

        return None

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()

        print("DELETE TEACHER ERROR:", e)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not delete teacher: {str(e)}",
        )

    """
    Permanently delete a teacher.

    Dependent records that contain teacher_id are removed first.
    This prevents PostgreSQL foreign-key errors when the teacher
    is deleted from the frontend.
    """

    # --------------------------------------------------------
    # 1. Check teacher exists
    # --------------------------------------------------------

    teacher = db.execute(
        text("""
            SELECT teacher_id
            FROM academic.teacher
            WHERE teacher_id = :teacher_id
        """),
        {
            "teacher_id": teacher_id
        },
    ).fetchone()

    if teacher is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with ID {teacher_id} not found",
        )

    try:

        # ----------------------------------------------------
        # 2. Delete dependent records from tables that contain
        #    teacher_id.
        #
        #    We only target known academic relationships here.
        # ----------------------------------------------------

        # Sections assigned to this teacher
        db.execute(
            text("""
                DELETE FROM academic.section
                WHERE teacher_id = :teacher_id
            """),
            {
                "teacher_id": teacher_id
            },
        )

        # Courses assigned directly to this teacher, if applicable
        db.execute(
            text("""
                DELETE FROM academic.course
                WHERE teacher_id = :teacher_id
            """),
            {
                "teacher_id": teacher_id
            },
        )

        # ----------------------------------------------------
        # 3. Delete the teacher
        # ----------------------------------------------------

        db.execute(
            text("""
                DELETE FROM academic.teacher
                WHERE teacher_id = :teacher_id
            """),
            {
                "teacher_id": teacher_id
            },
        )

        # ----------------------------------------------------
        # 4. Commit
        # ----------------------------------------------------

        db.commit()

    except Exception as e:

        # If anything fails, undo the transaction
        db.rollback()

        print("DELETE TEACHER ERROR:", e)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not delete teacher: {str(e)}",
        )

    # 204 means successful deletion with no response body
    return None