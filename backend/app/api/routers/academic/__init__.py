from app.api.routers.academic.course import router as course_router
from app.api.routers.academic.department import router as department_router
from app.api.routers.academic.enrollment import router as enrollment_router
from app.api.routers.academic.program import router as program_router
from app.api.routers.academic.section import router as section_router
from app.api.routers.academic.semester import router as semester_router
from app.api.routers.academic.student import router as student_router
from app.api.routers.academic.teacher import router as teacher_router

__all__ = [
    "department_router",
    "program_router",
    "semester_router",
    "course_router",
    "section_router",
    "student_router",
    "teacher_router",
    "enrollment_router",
]
