"""add password reset and account fields

Revision ID: c8e4a2d6f1b3
Revises: b5e1f7a3c9d2
Create Date: 2026-11-02 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8e4a2d6f1b3'
down_revision: Union[str, None] = 'b5e1f7a3c9d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('codigo_reset_hash', sa.String(), nullable=True))
    op.add_column('users', sa.Column('codigo_reset_expira', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('codigo_reset_intentos', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('password_actualizada_en', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('ultimo_login', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True))

    # Al borrar un usuario, las empresas que agregó se conservan sin autor
    op.drop_constraint('fk_companies_created_by_id_users', 'companies', type_='foreignkey')
    op.create_foreign_key(
        'fk_companies_created_by_id_users', 'companies', 'users',
        ['created_by_id'], ['id'], ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_companies_created_by_id_users', 'companies', type_='foreignkey')
    op.create_foreign_key(
        'fk_companies_created_by_id_users', 'companies', 'users', ['created_by_id'], ['id']
    )

    op.drop_column('users', 'updated_at')
    op.drop_column('users', 'ultimo_login')
    op.drop_column('users', 'password_actualizada_en')
    op.drop_column('users', 'codigo_reset_intentos')
    op.drop_column('users', 'codigo_reset_expira')
    op.drop_column('users', 'codigo_reset_hash')
