"""seed roles and priorities

Revision ID: 002_seed_data
Revises: 001_initial
Create Date: 2026-03-10

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_seed_data'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Definimos las tablas para el bulk_insert
    roles_table = sa.table('roles',
        sa.column('id', sa.Integer),
        sa.column('name', sa.String),
        sa.column('description', sa.String)
    )
    
    priorities_table = sa.table('priorities',
        sa.column('id', sa.Integer),
        sa.column('name', sa.String),
        sa.column('color_code', sa.String)
    )

    # Insertamos datos maestros para Roles
    op.bulk_insert(roles_table, [
        {'id': 1, 'name': 'Administrador', 'description': 'Acceso total al sistema'},
        {'id': 2, 'name': 'Tecnico', 'description': 'Atencion de tickets'},
        {'id': 3, 'name': 'Cliente', 'description': 'Usuario final'}
    ])

    # Insertamos datos maestros para Prioridades
    op.bulk_insert(priorities_table, [
        {'id': 1, 'name': 'Baja', 'color_code': '#28a745'},
        {'id': 2, 'name': 'Media', 'color_code': '#ffc107'},
        {'id': 3, 'name': 'Alta', 'color_code': '#dc3545'}
    ])


def downgrade() -> None:
    # Borramos los datos en orden inverso si fuera necesario
    op.execute("DELETE FROM priorities WHERE id IN (1, 2, 3)")
    op.execute("DELETE FROM roles WHERE id IN (1, 2, 3)")
