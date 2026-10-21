"""add users and company reviews

Revision ID: d4a7b2c9e1f0
Revises: 7a76c3b47c9a
Create Date: 2026-10-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4a7b2c9e1f0'
down_revision: Union[str, None] = '7a76c3b47c9a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('users',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('password_hash', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email')
    )
    op.add_column('companies', sa.Column('created_by_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_companies_created_by_id_users', 'companies', 'users', ['created_by_id'], ['id']
    )
    op.create_table('company_reviews',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('calificacion', sa.SmallInteger(), nullable=False),
    sa.Column('notas', sa.Text(), nullable=True),
    sa.Column('verificacion', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.CheckConstraint('calificacion BETWEEN 1 AND 5', name='ck_company_reviews_calificacion_range'),
    sa.CheckConstraint("verificacion IN ('existe', 'fantasma')", name='ck_company_reviews_verificacion_values'),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('company_id', 'user_id', name='uq_company_reviews_company_user')
    )


def downgrade() -> None:
    op.drop_table('company_reviews')
    op.drop_constraint('fk_companies_created_by_id_users', 'companies', type_='foreignkey')
    op.drop_column('companies', 'created_by_id')
    op.drop_table('users')
