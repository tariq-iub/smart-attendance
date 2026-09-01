from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.engine import create_engine

from app.database.base import Base
from app.database.connection import DATABASE_URL

# ---------------------------------------------------------------------------
# IMPORTANT:
# Import every ORM model so SQLAlchemy registers all mapped classes before
# Alembic inspects Base.metadata.
# ---------------------------------------------------------------------------

# Auth models
from app.models.auth.role import Role
from app.models.auth.permission import Permission
from app.models.auth.user_account import UserAccount
from app.models.auth.role_permission import RolePermission
from app.models.auth.user_role import UserRole
from app.models.auth.login_audit import LoginAudit

# Academic models
from app.models.academic.department import Department
from app.models.academic.program import Program
from app.models.academic.semester import Semester
from app.models.academic.course import Course
from app.models.academic.section import Section
from app.models.academic.teacher import Teacher
from app.models.academic.student import Student
from app.models.academic.enrollment import Enrollment

# Attendance models
from app.models.attendance.attendance import Attendance
from app.models.attendance.attendance_session import AttendanceSession
from app.models.attendance.attendance_summary import AttendanceSummary
from app.models.attendance.attendance_adjustment import AttendanceAdjustment
from app.models.attendance.attendance_audit_log import AttendanceAuditLog

# AI models
from app.models.ai.face_registration import FaceRegistration
from app.models.ai.face_embedding import FaceEmbedding
from app.models.ai.recognition_session import RecognitionSession
from app.models.ai.recognition_result import RecognitionResult
from app.models.ai.face_verification_log import FaceVerificationLog


# ---------------------------------------------------------------------------
# Alembic Config
# ---------------------------------------------------------------------------

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# ---------------------------------------------------------------------------
# SQLAlchemy Metadata
# ---------------------------------------------------------------------------

target_metadata = Base.metadata


# ---------------------------------------------------------------------------
# Offline Migration
# ---------------------------------------------------------------------------

def run_migrations_offline() -> None:
    """
    Run migrations without creating a database connection.

    Generates SQL statements using the configured database URL.
    """

    url = DATABASE_URL.render_as_string(hide_password=False)

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------------------------
# Online Migration
# ---------------------------------------------------------------------------

def run_migrations_online() -> None:
    """
    Run migrations using a live PostgreSQL database connection.
    """

    connectable = create_engine(
        DATABASE_URL,
        poolclass=pool.NullPool,
        future=True,
    )

    with connectable.connect() as connection:
        run_migrations_with_connection(connection)

    connectable.dispose()


def run_migrations_with_connection(connection: Connection) -> None:
    """
    Configure Alembic using an existing SQLAlchemy connection.
    """

    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_schemas=True,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------------------------
# Migration Entry Point
# ---------------------------------------------------------------------------

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()