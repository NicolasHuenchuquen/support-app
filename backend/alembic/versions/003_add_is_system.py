"""add is_system to messages

Revision ID: 003_add_is_system
Revises: 002_seed_data
Create Date: 2026-04-13

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_add_is_system'
down_revision = '002_seed_data'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Agregamos la columna is_system a messages
    op.add_column('messages', sa.Column('is_system', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    # Quitamos la columna is_system de messages si hacemos un rollback
    op.drop_column('messages', 'is_system')
