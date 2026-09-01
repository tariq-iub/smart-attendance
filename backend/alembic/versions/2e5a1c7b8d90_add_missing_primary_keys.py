"""add missing primary keys

Revision ID: 2e5a1c7b8d90
Revises: 97b03d9a5a49
Create Date: 2026-08-08
"""

from alembic import op


revision = "2e5a1c7b8d90"
down_revision = "97b03d9a5a49"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_primary_key(
        "attendance_adjustment_pkey",
        "attendance_adjustment",
        ["attendance_adjustment_id"],
        schema="attendance",
    )

    op.create_primary_key(
        "attendance_summary_pkey",
        "attendance_summary",
        ["attendance_summary_id"],
        schema="attendance",
    )


def downgrade() -> None:
    op.drop_constraint(
        "attendance_summary_pkey",
        "attendance_summary",
        type_="primary",
        schema="attendance",
    )

    op.drop_constraint(
        "attendance_adjustment_pkey",
        "attendance_adjustment",
        type_="primary",
        schema="attendance",
    )
