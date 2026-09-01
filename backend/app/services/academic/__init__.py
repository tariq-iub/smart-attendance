from app.services.academic.department import DepartmentService
from app.services.academic.program import ProgramService
from app.services.academic.semester import SemesterService
from app.services.academic.course import CourseService
from app.services.academic.section import SectionService
from app.services.academic.student import StudentService
from app.services.academic.teacher import TeacherService
from app.services.academic.enrollment import EnrollmentService

__all__ = [
    "DepartmentService",
    "ProgramService",
    "SemesterService",
    "CourseService",
    "SectionService",
    "StudentService",
    "TeacherService",
    "EnrollmentService",
]
