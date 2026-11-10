"""add email verification to users

Revision ID: b5e1f7a3c9d2
Revises: a9c2e4f6b8d1
Create Date: 2026-11-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b5e1f7a3c9d2'
down_revision: Union[str, None] = 'a9c2e4f6b8d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Las cuentas que ya existían quedan confirmadas; las nuevas arrancan sin confirmar
    op.add_column('users', sa.Column('email_verificado', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.alter_column('users', 'email_verificado', server_default=sa.false())
    op.add_column('users', sa.Column('codigo_verificacion_hash', sa.String(), nullable=True))
    op.add_column('users', sa.Column('codigo_verificacion_expira', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('codigo_verificacion_intentos', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('users', 'codigo_verificacion_intentos')
    op.drop_column('users', 'codigo_verificacion_expira')
    op.drop_column('users', 'codigo_verificacion_hash')
    op.drop_column('users', 'email_verificado')
