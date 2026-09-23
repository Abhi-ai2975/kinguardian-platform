"""Add authentication fields to profiles.

Revision ID: 0002_add_auth_fields
Revises: 0001_initial_platform
Create Date: 2026-09-04
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_add_auth_fields"
down_revision = "0001_initial_platform"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col["name"] for col in inspector.get_columns("profiles")]

    if "password_hash" not in columns:
        op.add_column("profiles", sa.Column("password_hash", sa.String(255), nullable=True))
    if "role" not in columns:
        op.add_column("profiles", sa.Column("role", sa.String(32), nullable=False, server_default="coordinator"))
    if "is_active" not in columns:
        op.add_column("profiles", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col["name"] for col in inspector.get_columns("profiles")]

    if "is_active" in columns:
        op.drop_column("profiles", "is_active")
    if "role" in columns:
        op.drop_column("profiles", "role")
    if "password_hash" in columns:
        op.drop_column("profiles", "password_hash")
