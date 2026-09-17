"""seed application statuses

Revision ID: e6fdce3c0fcc
Revises: 8c13d211dd65
Create Date: 2026-09-11 16:25:23.367989

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e6fdce3c0fcc'
down_revision: Union[str, None] = '8c13d211dd65'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

application_statuses = sa.table(
    "application_statuses",
    sa.column("id", sa.SmallInteger),
    sa.column("nombre", sa.String),
    sa.column("orden", sa.SmallInteger),
)

STATUSES = [
    {"id": 1, "nombre": "Aplicado", "orden": 1},
    {"id": 2, "nombre": "En revisión", "orden": 2},
    {"id": 3, "nombre": "Entrevista", "orden": 3},
    {"id": 4, "nombre": "Oferta", "orden": 4},
    {"id": 5, "nombre": "Rechazado", "orden": 5},
    {"id": 6, "nombre": "Retirado", "orden": 6},
]


def upgrade() -> None:
    conn = op.get_bind()
    for status in STATUSES:
        conn.execute(
            sa.text(
                """
                INSERT INTO application_statuses (id, nombre, orden)
                VALUES (:id, :nombre, :orden)
                ON CONFLICT (id) DO NOTHING
                """
            ),
            status,
        )


def downgrade() -> None:
    op.execute(
        application_statuses.delete().where(
            application_statuses.c.id.in_([s["id"] for s in STATUSES])
        )
    )
