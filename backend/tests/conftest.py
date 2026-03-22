import os
import sys

# Mock Variables de Entorno (necesario antes de importar app)
os.environ["DATABASE_URL"] = "postgresql://mock:mock@localhost:5432/mock_db"
os.environ["SECRET_KEY"] = "testing-secret-key-that-is-long-enough-to-pass-security-checks"
os.environ["FRONTEND_URL"] = "http://localhost:3000"

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Añadimos el directorio raíz del backend al path de Python
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.dependencies import get_db
from app.models.base import Base

# Importamos todos los modelos para que Base.metadata los reconozca
from app.models.user import User
from app.models.ticket import Ticket
from app.models.priority import Priority
from app.models.message import Message
from app.models.role import Role

# Usamos SQLite en memoria/archivo temporal para las pruebas rápidas y aisladas
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_api.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    # Crear tablas
    Base.metadata.create_all(bind=engine)
    
    # Insertar data inicial esencial (Roles, Prioridades)
    db = TestingSessionLocal()
    if not db.query(Role).first():
        db.add_all([
            Role(id=1, name="Client", description="Usuario regular"),
            Role(id=2, name="Technician", description="Técnico de soporte"),
            Role(id=3, name="Admin", description="Administrador"),
        ])
    if not db.query(Priority).first():
        db.add_all([
            Priority(id=1, name="Low"),
            Priority(id=2, name="Medium"),
            Priority(id=3, name="High"),
        ])
    db.commit()
    db.close()
    
    yield
    
    # Destruir tablas al terminar la sesión de pruebas
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists("./test_api.db"):
        os.remove("./test_api.db")

@pytest.fixture(scope="function")
def db_session():
    """
    Crea una sesión limpia para cada test usando transacciones que
    se hacen rollback al terminar. Así los tests no interfieren entre sí.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    """
    TestClient que sobrescribe la dependencia de base de datos
    para inyectar la sesión de prueba vacía en cada petición.
    """
    def override_get_db():
        yield db_session
        
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
