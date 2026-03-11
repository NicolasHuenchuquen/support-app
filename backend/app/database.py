from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# 1. El motor (Engine): Es el "puente" que conecta Python con PostgreSQL.
engine = create_engine(settings.DATABASE_URL)

# 2. La fábrica de sesiones: Crea una "sesión" cada vez que necesitamos hablar con la BD.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
