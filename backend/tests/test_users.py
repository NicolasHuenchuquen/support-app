"""
test_users.py
=============
Pruebas para los endpoints de registro y login:
  - POST /users/        → registrar nuevo usuario
  - POST /login/token   → iniciar sesión y obtener cookie JWT
"""
from tests.conftest import register_and_login


def test_register_user_success(client):
    """Prueba que un usuario nuevo puede registrarse correctamente."""
    response = client.post(
        "/users/",
        json={
            "email": "nuevo@test.com",
            "password": "Password123!",
            "full_name": "Usuario Test"
        }
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["email"] == "nuevo@test.com"
    assert "id" in data
    assert "hashed_password" not in data  # Importante: nunca exponer la contraseña


def test_register_duplicate_email(client):
    """Prueba que el sistema rechaza correos duplicados → 400."""
    # Primer registro
    client.post(
        "/users/",
        json={"email": "duplicado@test.com", "password": "Password123!"}
    )
    # Segundo registro con el mismo email
    response = client.post(
        "/users/",
        json={"email": "duplicado@test.com", "password": "Password123!"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Este email ya está en uso"


def test_login_success(client):
    """Prueba que un usuario válido recibe su cookie JWT tras el login."""
    client.post("/users/", json={"email": "login@test.com", "password": "Password123!"})

    # Iniciar sesión via OAuth2 Password Request Form (form-data, no JSON)
    response = client.post(
        "/login/token",
        data={"username": "login@test.com", "password": "Password123!"}
    )
    assert response.status_code == 200
    # Verificar que el servidor incluyó el header Set-Cookie con el access_token
    assert "set-cookie" in response.headers
    assert "access_token=" in response.headers["set-cookie"]


def test_login_invalid_password(client):
    """Prueba que credenciales inválidas retornan 401 Unauthorized."""
    client.post("/users/", json={"email": "login_fail@test.com", "password": "Password123!"})

    response = client.post(
        "/login/token",
        data={"username": "login_fail@test.com", "password": "WrongPassword"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Email o contraseña incorrectos"


def test_login_nonexistent_user(client):
    """Prueba que un email que no existe retorna 401 (no revela si existe o no)."""
    response = client.post(
        "/login/token",
        data={"username": "noexiste@test.com", "password": "Password123!"}
    )
    assert response.status_code == 401
