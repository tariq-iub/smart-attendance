from __future__ import annotations

from decimal import Decimal
from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
    Form,
)
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.services.face_recognition import (
    face_recognition_service,
)
from app.services.face_registration import (
    face_registration_service,
)


face_recognition_router = APIRouter(
    prefix="/attendance",
    tags=["Face Recognition"],
)


# ============================================================
# FACE ENROLLMENT
# ============================================================

@face_recognition_router.post(
    "/enroll/{student_id}",
    status_code=status.HTTP_201_CREATED,
)
async def enroll_face(
    student_id: int,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    ONE-FACE STUDENT ENROLLMENT

    Camera
        ↓
    One student's face
        ↓
    InsightFace
        ↓
    Duplicate-face protection
        ↓
    Face embedding
        ↓
    PostgreSQL
    """

    if (
        not image.content_type
        or not image.content_type.startswith(
            "image/"
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a valid image.",
        )

    image_bytes = await image.read()

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image is empty.",
        )

    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                "Image is too large. "
                "Maximum size is 10 MB."
            ),
        )

    try:

        result = (
            face_registration_service.enroll_student(
                db=db,
                student_id=student_id,
                image_bytes=image_bytes,
            )
        )

        return result

    except ValueError as exc:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Face enrollment failed: {exc}",
        ) from exc


# ============================================================
# CLASSROOM MULTI-FACE RECOGNITION + ATTENDANCE
# ============================================================

@face_recognition_router.post(
    "/recognize",
    status_code=status.HTTP_201_CREATED,
)
async def recognize_attendance(
    attendance_session_id: int = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    OFFICIAL CLASSROOM ATTENDANCE WORKFLOW

    Teacher
        ↓
    Active Attendance Session
        ↓
    attendance_session_id
        ↓
    Classroom Camera Image
        ↓
    InsightFace detects multiple faces
        ↓
    Only students belonging to the session's section
    are eligible for recognition
        ↓
    Recognized students
        ↓
    Duplicate check INSIDE THIS SESSION
        ↓
    Attendance records created
        ↓
    Same attendance_session_id
    """

    # ========================================================
    # 1. VALIDATE SESSION ID
    # ========================================================

    if attendance_session_id <= 0:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "A valid attendance session ID "
                "is required."
            ),
        )

    # ========================================================
    # 2. LOAD ACTIVE SESSION
    # ========================================================

    active_session = db.execute(
        text(
            """
            SELECT
                attendance_session_id,
                section_id,
                teacher_id,
                session_date,
                start_time,
                end_time,
                session_status
            FROM attendance.attendance_session
            WHERE attendance_session_id =
                  :attendance_session_id
              AND LOWER(session_status) IN
                  (
                    'active',
                    'open',
                    'running',
                    'in_progress',
                    'ongoing'
                  )
            LIMIT 1
            """
        ),
        {
            "attendance_session_id":
                attendance_session_id,
        },
    ).mappings().first()

    if active_session is None:

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "The selected attendance session "
                "is not active. Please start "
                "attendance before scanning students."
            ),
        )

    # ========================================================
    # 3. SESSION MUST BE TODAY
    # ========================================================

    today = datetime.now().date()

    if active_session["session_date"] != today:

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This attendance session belongs "
                "to another date. Please start a "
                "new attendance session for today."
            ),
        )

    # ========================================================
    # 4. LOAD SECTION ROSTER
    #
    # CRITICAL SECURITY RULE:
    #
    # Recognition is restricted to ACTIVE enrollments
    # belonging to this session's section.
    # ========================================================

    roster_rows = db.execute(
        text(
            """
            SELECT DISTINCT
                e.student_id
            FROM academic.enrollment e
            INNER JOIN academic.student s
                ON s.student_id = e.student_id
            WHERE e.section_id = :section_id
              AND LOWER(e.status) IN
                  (
                    'active',
                    'enrolled'
                  )
              AND s.is_active = TRUE
            """
        ),
        {
            "section_id":
                active_session["section_id"],
        },
    ).mappings().all()

    section_student_ids = {
        int(row["student_id"])
        for row in roster_rows
    }

    if not section_student_ids:

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No active students are enrolled "
                "in this section. Attendance cannot "
                "be started for an empty roster."
            ),
        )

    # ========================================================
    # 5. VALIDATE IMAGE
    # ========================================================

    if (
        not image.content_type
        or not image.content_type.startswith(
            "image/"
        )
    ):

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Please upload a valid classroom image."
            ),
        )

    image_bytes = await image.read()

    if not image_bytes:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image is empty.",
        )

    if len(image_bytes) > 10 * 1024 * 1024:

        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                "Image is too large. "
                "Maximum size is 10 MB."
            ),
        )

    # ========================================================
    # 6. MULTI-FACE INSIGHTFACE RECOGNITION
    #
    # IMPORTANT:
    # The service receives the section roster.
    #
    # Therefore a face belonging to a student from another
    # section cannot be recognized as an attendance candidate.
    # ========================================================

    try:

        recognition = (
            face_recognition_service.recognize(
                db=db,
                image_bytes=image_bytes,
                section_student_ids=(
                    section_student_ids
                ),
            )
        )

    except ValueError as exc:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                f"Face recognition failed: {exc}"
            ),
        ) from exc

    recognized_students = recognition.get(
        "recognized_students",
        [],
    )

    if not recognized_students:

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "No enrolled students from this "
                "section were recognized in the "
                "classroom image."
            ),
        )

    # ========================================================
    # 7. PROCESS EACH RECOGNIZED STUDENT
    # ========================================================

    current_time = datetime.now()

    recorded_students = []
    already_recorded_students = []

    for student in recognized_students:

        student_id = int(
            student["student_id"]
        )

        # ====================================================
        # DEFENSIVE SECTION CHECK
        # ====================================================

        if student_id not in section_student_ids:

            continue

        # ====================================================
        # DUPLICATE ATTENDANCE CHECK
        #
        # Duplicate means:
        #
        # SAME STUDENT
        # +
        # SAME ATTENDANCE SESSION
        #
        # A student can attend another session later.
        # ====================================================

        existing = db.execute(
            text(
                """
                SELECT
                    attendance_id,
                    attendance_status,
                    check_in_time,
                    confidence_score,
                    verification_method
                FROM attendance.attendance
                WHERE attendance_session_id =
                      :attendance_session_id
                  AND student_id = :student_id
                LIMIT 1
                """
            ),
            {
                "attendance_session_id":
                    attendance_session_id,

                "student_id":
                    student_id,
            },
        ).mappings().first()

        # ====================================================
        # ALREADY RECORDED
        # ====================================================

        if existing is not None:

            already_recorded_students.append(
                {
                    "attendance_id":
                        existing[
                            "attendance_id"
                        ],

                    "student_id":
                        student_id,

                    "student_name":
                        student[
                            "student_name"
                        ],

                    "registration_no":
                        student[
                            "registration_no"
                        ],

                    "confidence":
                        float(
                            existing[
                                "confidence_score"
                            ] or 0
                        ),

                    "status":
                        existing[
                            "attendance_status"
                        ],

                    "check_in_time":
                        (
                            existing[
                                "check_in_time"
                            ].isoformat()
                            if existing[
                                "check_in_time"
                            ]
                            else None
                        ),

                    "message":
                        (
                            "Attendance already "
                            "recorded for this student "
                            "in this session."
                        ),
                }
            )

            continue

        # ====================================================
        # CREATE PRESENT ATTENDANCE
        # ====================================================

        confidence = Decimal(
            str(
                round(
                    float(
                        student[
                            "confidence"
                        ]
                    ),
                    2,
                )
            )
        )

        result = db.execute(
            text(
                """
                INSERT INTO attendance.attendance
                (
                    attendance_session_id,
                    student_id,
                    attendance_status,
                    check_in_time,
                    confidence_score,
                    verification_method,
                    remarks,
                    created_at,
                    updated_at
                )
                VALUES
                (
                    :attendance_session_id,
                    :student_id,
                    'Present',
                    :check_in_time,
                    :confidence_score,
                    'Face Recognition',
                    :remarks,
                    :created_at,
                    :updated_at
                )
                RETURNING attendance_id
                """
            ),
            {
                "attendance_session_id":
                    attendance_session_id,

                "student_id":
                    student_id,

                "check_in_time":
                    current_time,

                "confidence_score":
                    confidence,

                "remarks":
                    (
                        "Automatically verified using "
                        "InsightFace classroom "
                        "multi-face recognition."
                    ),

                "created_at":
                    current_time,

                "updated_at":
                    current_time,
            },
        )

        attendance_id = result.scalar_one()

        recorded_students.append(
            {
                "attendance_id":
                    attendance_id,

                "student_id":
                    student_id,

                "student_name":
                    student[
                        "student_name"
                    ],

                "registration_no":
                    student[
                        "registration_no"
                    ],

                "confidence":
                    student[
                        "confidence"
                    ],

                "status":
                    "Present",

                "check_in_time":
                    current_time.isoformat(),

                "method":
                    "Face Recognition",
            }
        )

    # ========================================================
    # 8. RECALCULATE PRESENT COUNT
    #
    # Instead of blindly incrementing the counter, calculate
    # the actual number of Present records for this session.
    #
    # This keeps the session counter consistent.
    # ========================================================

    present_count = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM attendance.attendance
            WHERE attendance_session_id =
                  :attendance_session_id
              AND LOWER(attendance_status) = 'present'
            """
        ),
        {
            "attendance_session_id":
                attendance_session_id,
        },
    ).scalar_one()

    db.execute(
        text(
            """
            UPDATE attendance.attendance_session
            SET
                present_students = :present_count,
                total_students = :total_students,
                updated_at = :updated_at
            WHERE attendance_session_id =
                  :attendance_session_id
            """
        ),
        {
            "present_count":
                int(present_count),

            "total_students":
                len(section_student_ids),

            "attendance_session_id":
                attendance_session_id,

            "updated_at":
                current_time,
        },
    )

    # ========================================================
    # 9. COMMIT EVERYTHING
    # ========================================================

    try:

        db.commit()

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Attendance could not be saved. "
                "No classroom attendance changes "
                "were committed."
            ),
        ) from exc

    # ========================================================
    # 10. PROFESSIONAL RESPONSE
    # ========================================================

    return {
        "success": True,

        "attendance_session_id":
            attendance_session_id,

        "section_id":
            active_session[
                "section_id"
            ],

        "session_date":
            active_session[
                "session_date"
            ].isoformat(),

        "detected_face_count":
            recognition.get(
                "detected_face_count",
                0,
            ),

        "recognized_count":
            recognition.get(
                "recognized_count",
                0,
            ),

        "unknown_count":
            recognition.get(
                "unknown_count",
                0,
            ),

        "section_total_students":
            len(section_student_ids),

        "present_students":
            int(present_count),

        "newly_recorded_count":
            len(recorded_students),

        "already_recorded_count":
            len(
                already_recorded_students
            ),

        "recorded_students":
            recorded_students,

        "already_recorded_students":
            already_recorded_students,

        "message":
            (
                f"Classroom scan completed. "
                f"{len(recorded_students)} new "
                f"attendance record(s) recorded "
                f"successfully."
            ),
    }
