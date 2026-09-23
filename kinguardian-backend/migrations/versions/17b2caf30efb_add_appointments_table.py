"""add_appointments_table

Revision ID: 17b2caf30efb
Revises: 0002_add_auth_fields
Create Date: 2026-09-19 13:17:37.385967
"""
from alembic import op
import sqlalchemy as sa

revision = '17b2caf30efb'
down_revision = '0002_add_auth_fields'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'appointments',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('family_id', sa.Uuid(), nullable=False),
        sa.Column('subject_id', sa.Uuid(), nullable=False),
        sa.Column('created_by', sa.Uuid(), nullable=False),
        sa.Column('doctor_name', sa.String(length=200), nullable=False),
        sa.Column('specialty', sa.String(length=100), nullable=True),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('time', sa.String(length=10), nullable=False),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=24), server_default='scheduled', nullable=False),
        sa.Column('telehealth_link', sa.String(length=500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['profiles.id']),
        sa.ForeignKeyConstraint(['family_id'], ['families.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subject_id'], ['care_subjects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_appointments_family_id'), 'appointments', ['family_id'], unique=False)
    op.create_index(op.f('ix_appointments_subject_id'), 'appointments', ['subject_id'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_appointments_subject_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_family_id'), table_name='appointments')
    op.drop_table('appointments')
