"""add "sin respuesta" status and reminder fields

Revision ID: a1d6e3f8c2b9
Revises: e2f9b4c7a1d5
Create Date: 2026-11-11 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1d6e3f8c2b9'
down_revision: Union[str, None] = 'e2f9b4c7a1d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NO_RESPONSE_STATUS_ID = 7


def upgrade() -> None:
    op.execute(
        sa.text(
            "INSERT INTO application_statuses (id, nombre, orden) "
            "VALUES (:id, 'Sin respuesta', 7) ON CONFLICT (id) DO NOTHING"
        ).bindparams(id=NO_RESPONSE_STATUS_ID)
    )
    op.add_column('job_applications', sa.Column('estado_actualizado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True))
    op.add_column('job_applications', sa.Column('recordatorio_enviado_en', sa.DateTime(timezone=True), nullable=True))
    # Para las solicitudes existentes, la mejor estimación es su última modificación
    op.execute("UPDATE job_applications SET estado_actualizado_en = COALESCE(updated_at, created_at, now())")
    op.add_column('users', sa.Column('idioma', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'idioma')
    op.drop_column('job_applications', 'recordatorio_enviado_en')
    op.drop_column('job_applications', 'estado_actualizado_en')
    # Las solicitudes con este estado vuelven a "Aplicado" para no romper la clave foránea
    op.execute(
        sa.text("UPDATE job_applications SET estado_id = 1 WHERE estado_id = :id").bindparams(
            id=NO_RESPONSE_STATUS_ID
        )
    )
    op.execute(
        sa.text("DELETE FROM application_statuses WHERE id = :id").bindparams(
            id=NO_RESPONSE_STATUS_ID
        )
    )
