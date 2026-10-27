"""add photo to users

Revision ID: a9c2e4f6b8d1
Revises: f3b8c1d5a2e7
Create Date: 2026-10-27 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a9c2e4f6b8d1'
down_revision: Union[str, None] = 'f3b8c1d5a2e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('foto_filename', sa.String(), nullable=True))
    op.add_column('users', sa.Column('foto_content_type', sa.String(), nullable=True))
    op.add_column('users', sa.Column('foto_updated_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'foto_updated_at')
    op.drop_column('users', 'foto_content_type')
    op.drop_column('users', 'foto_filename')
