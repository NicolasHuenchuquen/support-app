from typing import Generator
from sqlalchemy.orm import Session
from app.database import SessionLocal

# Generator[Session, None, None] indica que:
# - Entrega (yield) una Session de base de datos.
# - No recibe datos externos (None).
# - No retorna nada al final (None).
def get_db() -> Generator[Session, None, None]:
    """
    Crea una sesión de base de datos para cada petición y la cierra al terminar.
    """
    db = SessionLocal()
    try:
        # yield 'presta' la sesión al router y pausa la función aquí.
        yield db
    finally:
        # Una vez que el router termina su trabajo, la función continúa y cierra la sesión.
        db.close()
