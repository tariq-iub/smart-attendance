from datetime import date, datetime

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.academic.student import (
    StudentCreate,
    StudentRead,
    StudentUpdate,
)
from app.services.academic.student import StudentService
from app.services.face_registration import (
    face_registration_service,
)


router = APIRouter(
    prefix="/students",
    tags=["Academic - Students"],
)


# ============================================================
# CREATE STUDENT
# ============================================================

@router.post(
    "/",
    response_model=StudentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_student(
    data: StudentCreate,
    db: Session = Depends(get_db),
):
    service = StudentService(db)

    return service.create(data)


# ============================================================
# CREATE STUDENT + REGISTER FACE
# ============================================================

@router.post(
    "/register-with-face",
    status_code=status.HTTP_201_CREATED,
)
async def register_student_with_face(
    program_id: int = Form(...),
    semester_id: int = Form(...),
    registration_no: str = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    phone: str | None = Form(None),
    gender: str = Form(...),
    date_of_birth: date | None = Form(None),
    admission_year: int = Form(...),
    current_status: str = Form(...),
    is_active: bool = Form(True),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Atomic student registration with face enrollment.

    IMPORTANT:

    The student is NOT committed to PostgreSQL until:

    1. Image is valid
    2. Exactly one face is detected
    3. Face embedding is generated
    4. Face is compared against existing biometric records
    5. No duplicate face is detected
    6. Student record and face embedding are both ready

    If ANY step fails:
        db.rollback()

    Therefore:
        Failed face registration = NO student record.
    """

    # --------------------------------------------------------
    # 1. VALIDATE IMAGE
    # --------------------------------------------------------

    if not image.content_type or not image.content_type.startswith(
        "image/"
    ):
        raise HTTPException(
            status_code=400,
            detail="Please upload a valid face image.",
        )

    image_bytes = await image.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty.",
        )

    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Image is too large. Maximum size is 10 MB.",
        )

    # --------------------------------------------------------
    # 2. VALIDATE STUDENT DATA
    # --------------------------------------------------------

    try:
        student_data = StudentCreate(
            program_id=program_id,
            semester_id=semester_id,
            registration_no=registration_no,
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            gender=gender,
            date_of_birth=date_of_birth,
            admission_year=admission_year,
            current_status=current_status,
            is_active=is_active,
        )

    except Exception as exc:

        raise HTTPException(
            status_code=422,
            detail=f"Invalid student information: {exc}",
        ) from exc

    try:

        # ----------------------------------------------------
        # 3. GENERATE FACE EMBEDDING FIRST
        # ----------------------------------------------------
        #
        # IMPORTANT:
        # The student does NOT exist in the database yet.
        #

        embedding = (
            face_registration_service.create_embedding(
                image_bytes
            )
        )

        # ----------------------------------------------------
        # 4. CREATE STUDENT IN CURRENT TRANSACTION
        # ----------------------------------------------------
        #
        # We intentionally use db.add() + db.flush()
        # instead of db.commit().
        #
        # flush() gives us student_id while keeping the
        # transaction uncommitted.
        #

        now = datetime.utcnow()

        from app.models.academic.student import Student

        student = Student(
            program_id=student_data.program_id,
            semester_id=student_data.semester_id,
            registration_no=student_data.registration_no,
            first_name=student_data.first_name,
            last_name=student_data.last_name,
            email=str(student_data.email),
            phone=student_data.phone,
            gender=student_data.gender,
            date_of_birth=student_data.date_of_birth,
            admission_year=student_data.admission_year,
            current_status=student_data.current_status,
            is_active=student_data.is_active,
            created_at=now,
            updated_at=now,
        )

        db.add(student)

        # Generate student_id without committing.
        db.flush()

        # ----------------------------------------------------
        # 5. CHECK DUPLICATE BIOMETRIC IDENTITY
        # ----------------------------------------------------
        #
        # The newly created student has an ID now, but the
        # transaction is still uncommitted.
        #

        duplicate = (
            face_registration_service.find_duplicate_face(
                db=db,
                new_embedding=embedding,
                current_student_id=student.student_id,
            )
        )

        if duplicate is not None:

            duplicate_name = (
                f"{duplicate['first_name'] or ''} "
                f"{duplicate['last_name'] or ''}"
            ).strip()

            duplicate_registration = (
                duplicate["registration_no"]
                or "N/A"
            )

            similarity_percentage = round(
                duplicate["similarity"] * 100,
                2,
            )

            # ----------------------------------------------
            # CRITICAL:
            #
            # The student was only FLUSHED, not committed.
            #
            # Rollback removes the new student automatically.
            # ----------------------------------------------

            db.rollback()

            raise HTTPException(
                status_code=409,
                detail={
                    "code": "FACE_ALREADY_REGISTERED",
                    "message": (
                        "This face is already registered "
                        "to another student. "
                        "The new student was NOT registered."
                    ),
                    "existing_student": duplicate_name,
                    "existing_registration_no": (
                        duplicate_registration
                    ),
                    "similarity": similarity_percentage,
                },
            )

        # ----------------------------------------------------
        # 6. SAVE FACE EMBEDDING
        # ----------------------------------------------------

        db.execute(
            text(
                """
                INSERT INTO attendance.face_embeddings
                (
                    student_id,
                    embedding,
                    created_at,
                    updated_at
                )
                VALUES
                (
                    :student_id,
                    :embedding,
                    :created_at,
                    :updated_at
                )
                """
            ),
            {
                "student_id": student.student_id,
                "embedding": embedding.tobytes(),
                "created_at": now,
                "updated_at": now,
            },
        )

        # ----------------------------------------------------
        # 7. FINAL COMMIT
        # ----------------------------------------------------

        db.commit()

        # ----------------------------------------------------
        # 8. REFRESH STUDENT
        # ----------------------------------------------------

        db.refresh(student)

        # ----------------------------------------------------
        # 9. SUCCESS RESPONSE
        # ----------------------------------------------------

        return {
            "success": True,
            "student_id": student.student_id,
            "student_name": (
                f"{student.first_name} "
                f"{student.last_name}"
            ).strip(),
            "registration_no": student.registration_no,
            "message": (
                "Student registered successfully. "
                "Face verified and enrolled. "
                "The student is now ready for "
                "face recognition and attendance."
            ),
        }

    except HTTPException:
        raise

    except ValueError as exc:

        db.rollback()

        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Student registration failed. "
                "No student or biometric record "
                "was saved."
            ),
        ) from exc


# ============================================================
# LIST ALL STUDENTS
# ============================================================

@router.get(
    "/",
    response_model=list[StudentRead],
)
def list_students(
    db: Session = Depends(get_db),
):
    service = StudentService(db)

    return service.get_all()


# ============================================================
# GET SINGLE STUDENT
# ============================================================

@router.get(
    "/{student_id}",
    response_model=StudentRead,
)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
):
    service = StudentService(db)

    student = service.get(student_id)

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    return student


# ============================================================
# UPDATE STUDENT
# ============================================================

@router.put(
    "/{student_id}",
    response_model=StudentRead,
)
def update_student(
    student_id: int,
    data: StudentUpdate,
    db: Session = Depends(get_db),
):
    service = StudentService(db)

    student = service.update(
        student_id,
        data,
    )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    return student


# ============================================================
# DELETE STUDENT
# ============================================================

@router.delete(
    "/{student_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
):
    """
    Permanently delete a student and their dependent records.
    """

    student = db.execute(
        text(
            """
            SELECT student_id
            FROM academic.student
            WHERE student_id = :student_id
            """
        ),
        {
            "student_id": student_id,
        },
    ).fetchone()

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    try:

        db.execute(
            text(
                """
                DELETE FROM ai.face_verification_log
                WHERE student_id = :student_id
                """
            ),
            {
                "student_id": student_id,
            },
        )

        db.execute(
            text(
                """
                DELETE FROM ai.recognition_result
                WHERE student_id = :student_id
                """
            ),
            {
                "student_id": student_id,
            },
        )

        db.execute(
            text(
                """
                DELETE FROM ai.face_embedding
                WHERE student_id = :student_id
                """
            ),
            {
                "student_id": student_id,
            },
        )

        db.execute(
            text(
                """
                DELETE FROM ai.face_registration
                WHERE student_id = :student_id
                """
            ),
            {
                "student_id": student_id,
            },
        )

        db.execute(
            text(
                """
                DELETE FROM attendance.attendance
                WHERE student_id = :student_id
                """
            ),
            {
                "student_id": student_id,
            },
        )

        db.execute(
            text(
                """
                DELETE FROM academic.enrollment
                WHERE student_id = :student_id
                """
            ),
            {
                "student_id": student_id,
            },
        )

        db.execute(
            text(
                """
                DELETE FROM academic.student
                WHERE student_id = :student_id
                """
            ),
            {
                "student_id": student_id,
            },
        )

        db.commit()

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not delete student: {exc}",
        ) from exc

    return None