"""fix login audit primary key

Revision ID: 45ef402de375
Revises: 2e5a1c7b8d90
Create Date: 2026-08-10
"""

from alembic import op


revision = "45ef402de375"
down_revision = "2e5a1c7b8d90"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove the incorrect composite primary key.
    op.drop_constraint(
        "login_audit_pkey",
        "login_audit",
        schema="auth",
        type_="primary",
    )

    # Create the correct single-column primary key.
    op.create_primary_key(
        "login_audit_pkey",
        "login_audit",
        ["login_audit_id"],
        schema="auth",
    )


def downgrade() -> None:
    # Remove the corrected primary key.
    op.drop_constraint(
        "login_audit_pkey",
        "login_audit",
        schema="auth",
        type_="primary",
    )

    # Restore the previous composite primary key.
    op.create_primary_key(
        "login_audit_pkey",
        "login_audit",
        [
            "login_audit_id",
            "login_time",
            "created_at",
            "updated_at",
        ],
        schema="auth",
    )