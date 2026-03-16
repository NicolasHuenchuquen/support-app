import sys
import os
import pytest
from fastapi.testclient import TestClient

# Añadimos el directorio raíz del backend al path de Python para que encuentre "app"
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app


# Instanciamos el cliente de pruebas de FastAPI
# Esto levanta una versión virtual y ligera de tu API en memoria (sin usar el puerto 8000 real)
client = TestClient(app)

def test_health_endpoint():
    """
    Prueba unitaria básica: Verifica que el endpoint /health responde correctamente.
    Este es el test ideal para que GitLab CI/CD verifique que la API no tiene errores de sintaxis críticos.
    """
    # 1. Hacemos la petición GET simulada al endpoint
    response = client.get("/health")
    
    # 2. Verificamos que el código HTTP sea 200 (Éxito)
    assert response.status_code == 200
    
    # 3. Verificamos que el JSON de respuesta contenga al menos el status esperado.
    # Como "db_info" es dinámico, verificamos solo la llave "status"
    assert response.json()["status"] == "ok"
    