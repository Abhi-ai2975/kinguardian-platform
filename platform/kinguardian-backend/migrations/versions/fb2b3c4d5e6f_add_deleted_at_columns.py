"""add deleted_at columns to care_subjects, care_tasks, monitoring_preferences, health_documents

Revision ID: fb2b3c4d5e6f
Revises: fa1a2b3c4d5e
Create Date: 2026-08-31 22:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fb2b3c4d5e6f'
down_revision: Union[str, None] = 'fa1a2b3c4d5e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE care_subjects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE care_tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE monitoring_preferences ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE health_documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE")


def downgrade() -> None:
    op.drop_column('health_documents', 'deleted_at')
    op.drop_column('monitoring_preferences', 'deleted_at')
    op.drop_column('care_tasks', 'deleted_at')
    op.drop_column('care_subjects', 'deleted_at')
