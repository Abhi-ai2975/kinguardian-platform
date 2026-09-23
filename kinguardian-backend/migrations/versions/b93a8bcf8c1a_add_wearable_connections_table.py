"""add_wearable_connections_table

Revision ID: b93a8bcf8c1a
Revises: 17b2caf30efb
Create Date: 2026-09-20 10:00:19.901540
"""
from alembic import op
import sqlalchemy as sa

revision = 'b93a8bcf8c1a'
down_revision = '17b2caf30efb'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'wearable_connections',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('subject_id', sa.Uuid(), nullable=False),
        sa.Column('device_type', sa.String(length=64), server_default='Apple Watch / Omron', nullable=False),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('sync_status', sa.String(length=32), server_default='synced', nullable=False),
        sa.ForeignKeyConstraint(['subject_id'], ['care_subjects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_wearable_connections_subject_id'), 'wearable_connections', ['subject_id'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_wearable_connections_subject_id'), table_name='wearable_connections')
    op.drop_table('wearable_connections')
