from app.crud.auth import (
    user_account,
    role,
    permission,
    user_role,
    role_permission,
    login_audit,
)

from app.crud.academic import (
    department,
    program,
    semester,
    course,
    section,
    student,
    teacher,
    enrollment,
)

from app.crud.attendance import (
    attendance,
    attendance_session,
    attendance_adjustment,
    attendance_audit_log,
    attendance_summary,
)

from app.crud.ai import (
    face_registration,
    face_embedding,
    recognition_session,
    recognition_result,
    face_verification_log,
)

__all__ = [
    "user_account",
    "role",
    "permission",
    "user_role",
    "role_permission",
    "login_audit",
    "department",
    "program",
    "semester",
    "course",
    "section",
    "student",
    "teacher",
    "enrollment",
    "attendance",
    "attendance_session",
    "attendance_adjustment",
    "attendance_audit_log",
    "attendance_summary",
    "face_registration",
    "face_embedding",
    "recognition_session",
    "recognition_result",
    "face_verification_log",
]
