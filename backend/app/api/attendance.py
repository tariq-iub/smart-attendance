from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.connection import get_db


router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"],
)


# ============================================================
# GET ATTENDANCE RECORDS
#
# IMPORTANT:
# POST /attendance/recognize is intentionally NOT defined here.
#
# Classroom face recognition is handled ONLY by:
#
# app/api/face_recognition.py
#
# POST /attendance/recognize
#
# This prevents duplicate route conflicts.
# ============================================================

@router.get("/")
def get_attendance(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    rows = db.execute(
        text(
            """
            SELECT
                a.attendance_id,
                a.attendance_session_id,
                a.student_id,
                CONCAT(
                    s.first_name,
                    ' ',
                    s.last_name
                ) AS student_name,
                a.attendance_status,
                a.check_in_time,
                a.confidence_score,
                a.verification_method,
                a.remarks,
                a.created_at,
                a.updated_at
            FROM attendance.attendance a
            JOIN academic.student s
                ON s.student_id = a.student_id
            ORDER BY
                a.check_in_time DESC NULLS LAST
            OFFSET :skip
            LIMIT :limit
            """
        ),
        {
            "skip": skip,
            "limit": limit,
        },
    ).mappings().all()

    return [dict(row) for row in rows]