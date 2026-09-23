"""add organizations table and organization_id to families

Revision ID: fa1a2b3c4d5e
Revises: e9c1d2e3f4a5
Create Date: 2026-08-31 22:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fa1a2b3c4d5e'
down_revision: Union[str, None] = 'e9c1d2e3f4a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create organizations table if not exists
    op.create_table(
        'organizations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='active', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_organizations_slug'), 'organizations', ['slug'], unique=True)

    # 2. Add organization_id column to families
    op.add_column('families', sa.Column('organization_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_families_organization_id',
        'families',
        'organizations',
        ['organization_id'],
        ['id'],
        ondelete='SET NULL'
    )

    # 3. Add missing deleted_at columns
    op.add_column('care_subjects', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('care_tasks', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('monitoring_preferences', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('health_documents', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_constraint('fk_families_organization_id', 'families', type_='foreignkey')
    op.drop_column('families', 'organization_id')
    op.drop_index(op.f('ix_organizations_slug'), table_name='organizations')
    op.drop_table('organizations')
