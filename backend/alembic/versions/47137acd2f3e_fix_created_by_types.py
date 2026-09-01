"""fix created_by types

Revision ID: 47137acd2f3e
Revises: 45ef402de375
Create Date: 2026-08-10 08:04:11.023100

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "47137acd2f3e"
down_revision: Union[str, Sequence[str], None] = "45ef402de375"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.alter_column(
        "role_permission",
        "created_by",
        existing_type=sa.TIMESTAMP(),
        type_=sa.Integer(),
        existing_nullable=False,
        postgresql_using="0",
        schema="auth",
    )

    op.alter_column(
        "user_role",
        "created_by",
        existing_type=sa.TIMESTAMP(),
        type_=sa.Integer(),
        existing_nullable=False,
        postgresql_using="0",
        schema="auth",
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.alter_column(
        "role_permission",
        "created_by",
        existing_type=sa.Integer(),
        type_=sa.TIMESTAMP(),
        existing_nullable=False,
        postgresql_using="to_timestamp(created_by)",
        schema="auth",
    )

    op.alter_column(
        "user_role",
        "created_by",
        existing_type=sa.Integer(),
        type_=sa.TIMESTAMP(),
        existing_nullable=False,
        postgresql_using="to_timestamp(created_by)",
        schema="auth",
    )
