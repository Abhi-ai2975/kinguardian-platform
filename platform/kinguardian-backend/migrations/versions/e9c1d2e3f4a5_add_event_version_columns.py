"""add event version columns to event logs and outbox events

Revision ID: e9c1d2e3f4a5
Revises: d8952e59b725
Create Date: 2026-08-27 01:21:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e9c1d2e3f4a5'
down_revision: Union[str, None] = 'd8952e59b725'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add event_version column to event_logs
    op.add_column('event_logs', sa.Column('event_version', sa.Integer(), nullable=False, server_default='1'))
    # Add event_version column to outbox_events
    op.add_column('outbox_events', sa.Column('event_version', sa.Integer(), nullable=False, server_default='1'))


def downgrade() -> None:
    op.drop_column('outbox_events', 'event_version')
    op.drop_column('event_logs', 'event_version')
