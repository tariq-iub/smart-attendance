from datetime import datetime

from pydantic import Field

from app.schemas.base import BaseSchema


# ============================================================
# CREATE COURSE
# ============================================================

class CourseCreate(BaseSchema):

    program_id: int

    semester_id: int

    course_code: str = Field(
        min_length=1,
        max_length=20,
    )

    course_name: str = Field(
        min_length=1,
        max_length=150,
    )

    credit_hours: int = Field(
        ge=1,
    )

    is_lab: bool = False


# ============================================================
# UPDATE COURSE
# ============================================================

class CourseUpdate(BaseSchema):

    program_id: int | None = None

    semester_id: int | None = None

    course_code: str | None = Field(
        default=None,
        max_length=20,
    )

    course_name: str | None = Field(
        default=None,
        max_length=150,
    )

    credit_hours: int | None = Field(
        default=None,
        ge=1,
    )

    is_lab: bool | None = None


# ============================================================
# READ COURSE
# ============================================================

class CourseRead(BaseSchema):

    course_id: int

    program_id: int

    semester_id: int

    course_code: str

    course_name: str

    credit_hours: int

    is_lab: bool

    created_at: datetime

    updated_at: datetime