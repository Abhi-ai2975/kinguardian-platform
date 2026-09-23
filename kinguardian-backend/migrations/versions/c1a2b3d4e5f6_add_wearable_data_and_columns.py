"""add_wearable_data_and_columns

Revision ID: c1a2b3d4e5f6
Revises: b93a8bcf8c1a
Create Date: 2026-09-20 16:15:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'c1a2b3d4e5f6'
down_revision = 'b93a8bcf8c1a'
branch_labels = None
depends_on = None

def upgrade():
    # 1. Add missing columns to wearable_connections
    op.add_column('wearable_connections', sa.Column('provider', sa.String(length=64), server_default='fitbit', nullable=True))
    op.add_column('wearable_connections', sa.Column('connection_status', sa.String(length=32), server_default='connected', nullable=True))
    op.add_column('wearable_connections', sa.Column('device_id', sa.String(length=128), nullable=True))
    op.add_column('wearable_connections', sa.Column('source', sa.String(length=64), nullable=True))
    op.add_column('wearable_connections', sa.Column('disconnected_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('wearable_connections', sa.Column('is_stale', sa.Boolean(), server_default=sa.text('false'), nullable=True))
    op.add_column('wearable_connections', sa.Column('access_token', sa.String(length=512), nullable=True))
    op.add_column('wearable_connections', sa.Column('refresh_token', sa.String(length=512), nullable=True))

    # 2. Create wearable_data table
    op.create_table(
        'wearable_data',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('subject_id', sa.Uuid(), nullable=False),
        sa.Column('connection_id', sa.Uuid(), nullable=True),
        sa.Column('steps', sa.Integer(), server_default='0', nullable=False),
        sa.Column('heart_rate', sa.Integer(), server_default='72', nullable=False),
        sa.Column('date', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('source', sa.String(length=64), server_default='garmin', nullable=False),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('device_id', sa.String(length=128), nullable=True),
        sa.Column('sleep_minutes', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['connection_id'], ['wearable_connections.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['subject_id'], ['care_subjects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_wearable_data_subject_id'), 'wearable_data', ['subject_id'], unique=False)
    op.create_index(op.f('ix_wearable_data_date'), 'wearable_data', ['date'], unique=False)
    op.create_index(op.f('ix_wearable_data_source'), 'wearable_data', ['source'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_wearable_data_source'), table_name='wearable_data')
    op.drop_index(op.f('ix_wearable_data_date'), table_name='wearable_data')
    op.drop_index(op.f('ix_wearable_data_subject_id'), table_name='wearable_data')
    op.drop_table('wearable_data')
    op.drop_column('wearable_connections', 'refresh_token')
    op.drop_column('wearable_connections', 'access_token')
    op.drop_column('wearable_connections', 'is_stale')
    op.drop_column('wearable_connections', 'disconnected_at')
    op.drop_column('wearable_connections', 'source')
    op.drop_column('wearable_connections', 'device_id')
    op.drop_column('wearable_connections', 'connection_status')
    op.drop_column('wearable_connections', 'provider')
