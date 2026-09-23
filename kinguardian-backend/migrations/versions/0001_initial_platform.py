"""Initial KinGuardian owned data model.

Revision ID: 0001_initial_platform
"""
from alembic import op
from app.db import Base
import app.models

revision = "0001_initial_platform"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    Base.metadata.create_all(op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(op.get_bind())
