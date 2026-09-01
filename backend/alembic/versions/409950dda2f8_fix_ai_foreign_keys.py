"""fix ai foreign keys

Revision ID: 409950dda2f8
Revises: 47137acd2f3e
"""

from typing import Sequence, Union

from alembic import op


revision: str = "409950dda2f8"
down_revision: Union[str, Sequence[str], None] = "47137acd2f3e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Only create constraints that do not already exist.
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'fk_face_registration_student'
            ) THEN
                ALTER TABLE ai.face_registration
                ADD CONSTRAINT fk_face_registration_student
                FOREIGN KEY (student_id)
                REFERENCES academic.student(student_id);
            END IF;
        END $$;
    """)

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'fk_recognition_session_attendance'
            ) THEN
                ALTER TABLE ai.recognition_session
                ADD CONSTRAINT fk_recognition_session_attendance
                FOREIGN KEY (attendance_session_id)
                REFERENCES attendance.attendance_session(attendance_session_id);
            END IF;
        END $$;
    """)

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'fk_recognition_result_student'
            ) THEN
                ALTER TABLE ai.recognition_result
                ADD CONSTRAINT fk_recognition_result_student
                FOREIGN KEY (student_id)
                REFERENCES academic.student(student_id);
            END IF;
        END $$;
    """)

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'fk_face_verification_log_student'
            ) THEN
                ALTER TABLE ai.face_verification_log
                ADD CONSTRAINT fk_face_verification_log_student
                FOREIGN KEY (student_id)
                REFERENCES academic.student(student_id);
            END IF;
        END $$;
    """)

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'fk_face_embedding_student'
            ) THEN
                ALTER TABLE ai.face_embedding
                ADD CONSTRAINT fk_face_embedding_student
                FOREIGN KEY (student_id)
                REFERENCES academic.student(student_id);
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE ai.face_embedding
        DROP CONSTRAINT IF EXISTS fk_face_embedding_student;
    """)

    op.execute("""
        ALTER TABLE ai.face_verification_log
        DROP CONSTRAINT IF EXISTS fk_face_verification_log_student;
    """)

    op.execute("""
        ALTER TABLE ai.recognition_result
        DROP CONSTRAINT IF EXISTS fk_recognition_result_student;
    """)

    op.execute("""
        ALTER TABLE ai.recognition_session
        DROP CONSTRAINT IF EXISTS fk_recognition_session_attendance;
    """)

    op.execute("""
        ALTER TABLE ai.face_registration
        DROP CONSTRAINT IF EXISTS fk_face_registration_student;
    """)