import sys
import os
import pytest
from fastapi.testclient import TestClient

# Añadimos el directorio raíz del backend al path de Python para que encuentre "app"
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app


# Instancia del cliente de pruebas de FastAPI
# Levanta una versión virtual de la API en memoria para la ejecución de pruebas
client = TestClient(app)

def test_health_endpoint():
    """
    Prueba unitaria: Verifica que el endpoint /health responde correctamente.
    Utilizada en CI/CD para asegurar que la API no contiene errores de sintaxis críticos.
    """
    # 1. Ejecución de petición GET al endpoint
    response = client.get("/health")
    
    # 2. Verificación de código HTTP 200 (Éxito)
    assert response.status_code == 200
    
    # 3. Verificación del contenido del JSON de respuesta.
    # Se evalúa únicamente la llave "status" dado que "db_info" es dinámico.
    assert response.json()["status"] == "ok"
    