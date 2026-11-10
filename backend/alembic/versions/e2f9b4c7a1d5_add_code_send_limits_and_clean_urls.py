"""add code send limits and clean unsafe urls

Revision ID: e2f9b4c7a1d5
Revises: c8e4a2d6f1b3
Create Date: 2026-11-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2f9b4c7a1d5'
down_revision: Union[str, None] = 'c8e4a2d6f1b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for kind in ('verificacion', 'reset'):
        op.add_column('users', sa.Column(f'codigo_{kind}_envios', sa.Integer(), nullable=False, server_default='0'))
        op.add_column('users', sa.Column(f'codigo_{kind}_envios_desde', sa.DateTime(timezone=True), nullable=True))

    # Los códigos pendientes eran de 5 dígitos; se invalidan para pedir uno nuevo de 6
    op.execute(
        "UPDATE users SET codigo_verificacion_hash = NULL, codigo_verificacion_expira = NULL, "
        "codigo_reset_hash = NULL, codigo_reset_expira = NULL"
    )

    # Enlaces guardados antes de validar: sin esquema se les agrega https:// (como hace la API)
    # y se quitan los que usan otro esquema (ej. javascript:, que ejecuta código al hacer clic)
    for table, column in (('companies', 'sitio_web'), ('job_applications', 'enlace_oferta')):
        op.execute(
            f"UPDATE {table} SET {column} = 'https://' || btrim({column}) "
            f"WHERE {column} IS NOT NULL AND {column} NOT LIKE '%://%' "
            f"AND {column} !~* '^\\s*(javascript|data|vbscript):'"
        )
        op.execute(
            f"UPDATE {table} SET {column} = NULL "
            f"WHERE {column} IS NOT NULL AND {column} !~* '^https?://'"
        )


def downgrade() -> None:
    for kind in ('reset', 'verificacion'):
        op.drop_column('users', f'codigo_{kind}_envios_desde')
        op.drop_column('users', f'codigo_{kind}_envios')
