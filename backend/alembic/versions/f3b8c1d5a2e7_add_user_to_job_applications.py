"""add user to job applications

Revision ID: f3b8c1d5a2e7
Revises: d4a7b2c9e1f0
Create Date: 2026-10-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3b8c1d5a2e7'
down_revision: Union[str, None] = 'd4a7b2c9e1f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Nullable: las solicitudes creadas antes de existir usuarios quedan sin dueño
    op.add_column('job_applications', sa.Column('user_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_job_applications_user_id_users', 'job_applications', 'users',
        ['user_id'], ['id'], ondelete='CASCADE'
    )
    op.create_index('ix_job_applications_user_id', 'job_applications', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_job_applications_user_id', table_name='job_applications')
    op.drop_constraint('fk_job_applications_user_id_users', 'job_applications', type_='foreignkey')
    op.drop_column('job_applications', 'user_id')
