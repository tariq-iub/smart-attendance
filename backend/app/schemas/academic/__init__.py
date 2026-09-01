from app.schemas.academic.course import (
    CourseCreate,
    CourseRead,
    CourseUpdate,
)
from app.schemas.academic.department import (
    DepartmentCreate,
    DepartmentRead,
    DepartmentUpdate,
)
from app.schemas.academic.enrollment import (
    EnrollmentCreate,
    EnrollmentRead,
    EnrollmentUpdate,
)
from app.schemas.academic.program import (
    ProgramCreate,
    ProgramRead,
    ProgramUpdate,
)
from app.schemas.academic.section import (
    SectionCreate,
    SectionRead,
    SectionUpdate,
)
from app.schemas.academic.semester import (
    SemesterCreate,
    SemesterRead,
    SemesterUpdate,
)
from app.schemas.academic.student import (
    StudentCreate,
    StudentRead,
    StudentUpdate,
)
from app.schemas.academic.teacher import (
    TeacherCreate,
    TeacherRead,
    TeacherUpdate,
)

__all__ = [
    "DepartmentCreate",
    "DepartmentRead",
    "DepartmentUpdate",
    "ProgramCreate",
    "ProgramRead",
    "ProgramUpdate",
    "SemesterCreate",
    "SemesterRead",
    "SemesterUpdate",
    "CourseCreate",
    "CourseRead",
    "CourseUpdate",
    "SectionCreate",
    "SectionRead",
    "SectionUpdate",
    "TeacherCreate",
    "TeacherRead",
    "TeacherUpdate",
    "StudentCreate",
    "StudentRead",
    "StudentUpdate",
    "EnrollmentCreate",
    "EnrollmentRead",
    "EnrollmentUpdate",
]
