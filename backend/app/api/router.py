from fastapi import APIRouter
from app.api.face_recognition import face_recognition_router

# ============================================================
# AUTH ROUTERS
# ============================================================

from app.api.routers.auth import (
    login_audit_router,
    permission_router,
    role_permission_router,
    role_router,
    user_account_router,
    user_role_router,
)

# ============================================================
# ACADEMIC ROUTERS
# ============================================================

from app.api.routers.academic import (
    course_router,
    department_router,
    enrollment_router,
    program_router,
    section_router,
    semester_router,
    student_router,
    teacher_router,
)

# ============================================================
# ATTENDANCE ROUTERS
# ============================================================

from app.api.routers.attendance import (
    attendance_router,
    attendance_session_router,
    attendance_adjustment_router,
    attendance_audit_log_router,
    attendance_summary_router,
)

# ============================================================
# FACE RECOGNITION ROUTER
# ============================================================

from app.api.face_recognition import face_recognition_router


# ============================================================
# API ROUTER
# ============================================================

api_router = APIRouter(
    prefix="/api/v1"
)

# ============================================================
# AUTH ROUTER REGISTRATION
# ============================================================

api_router.include_router(user_account_router)
api_router.include_router(role_router)
api_router.include_router(permission_router)
api_router.include_router(user_role_router)
api_router.include_router(role_permission_router)
api_router.include_router(login_audit_router)

# ============================================================
# ACADEMIC ROUTER REGISTRATION
# ============================================================

api_router.include_router(department_router)
api_router.include_router(program_router)
api_router.include_router(semester_router)
api_router.include_router(course_router)
api_router.include_router(section_router)
api_router.include_router(student_router)
api_router.include_router(teacher_router)
api_router.include_router(enrollment_router)

# ============================================================
# ATTENDANCE ROUTER REGISTRATION
# ============================================================

api_router.include_router(attendance_router)
api_router.include_router(attendance_session_router)
api_router.include_router(attendance_adjustment_router)
api_router.include_router(attendance_audit_log_router)
api_router.include_router(attendance_summary_router)

# ============================================================
# FACE RECOGNITION ROUTER REGISTRATION
# ============================================================

api_router.include_router(face_recognition_router)
api_router.include_router(
    face_recognition_router
)