import sys
import os
from sqlalchemy import engine_from_config, pool
from alembic import context

# 1. Agregamos la carpeta 'backend' al path de Python para que Alembic encuentre los modelos
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 2. Importamos los modelos y la configuración
from app.models.base import Base
import app.models  # Esto registra User, Ticket, etc. en Base.metadata
from app.core.config import settings

# 3. Obtenemos el objeto de configuración de Alembic
config = context.config

# 4. Le pasamos los modelos a Alembic para el "autogenerate"
target_metadata = Base.metadata

# 5. Sobreescribimos la URL de la base de datos con la del .env / Docker
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)


def run_migrations_offline() -> None:
    """Modo Offline: Genera el SQL sin conectarse a la DB real."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Modo Online: Se conecta a la DB y aplica los cambios."""
    connectable = engine_from_config(
        {"sqlalchemy.url": config.get_main_option("sqlalchemy.url")},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
