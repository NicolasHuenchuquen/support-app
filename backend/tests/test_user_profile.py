"""
test_user_profile.py
====================
Pruebas para los endpoints de perfil de usuario:
  - GET  /users/me       → perfil del usuario autenticado
  - GET  /users/         → listado público de usuarios
  - POST /login/logout   → cerrar sesión
"""
from tests.conftest import register_and_login


# ---------------------------------------------------------------------------
# Tests: GET /users/me
# ---------------------------------------------------------------------------

def test_get_my_profile_authenticated(client):
    """Un usuario autenticado puede obtener su propio perfil."""
    cookies = register_and_login(client, "me_test@test.com")

    client.cookies.update(cookies)
    res = client.get("/users/me")
    client.cookies.clear()

    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "me_test@test.com"
    # La contraseña nunca debe aparecer en la respuesta (seguridad)
    assert "hashed_password" not in data
    assert "password" not in data
    assert "id" in data
    assert "role_id" in data


def test_get_my_profile_unauthenticated(client):
    """Sin cookie, /users/me retorna 401 Unauthorized."""
    res = client.get("/users/me")
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# Tests: GET /users/
# ---------------------------------------------------------------------------

def test_list_users_returns_list(client):
    """GET /users/ devuelve una lista (con al menos un usuario creado)."""
    register_and_login(client, "list_user@test.com")

    res = client.get("/users/")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
    assert len(res.json()) >= 1


def test_list_users_no_passwords_exposed(client):
    """La lista de usuarios nunca expone contraseñas (verificación de seguridad)."""
    register_and_login(client, "no_pass@test.com")

    res = client.get("/users/")
    assert res.status_code == 200
    for user in res.json():
        assert "hashed_password" not in user
        assert "password" not in user


# ---------------------------------------------------------------------------
# Tests: POST /login/logout
# ---------------------------------------------------------------------------

def test_logout_returns_200(client):
    """El endpoint de logout responde con 200."""
    cookies = register_and_login(client, "logout_user@test.com")

    client.cookies.update(cookies)
    res = client.post("/login/logout")
    client.cookies.clear()

    assert res.status_code == 200


def test_logout_clears_cookie(client):
    """El logout responde con Set-Cookie que borra el access_token."""
    cookies = register_and_login(client, "logout_cookie@test.com")

    client.cookies.update(cookies)
    res = client.post("/login/logout")
    client.cookies.clear()

    assert res.status_code == 200
    set_cookie = res.headers.get("set-cookie", "")
    # El servidor debe instruir al navegador a borrar la cookie
    assert "access_token" in set_cookie


def test_after_logout_me_returns_401(client):
    """
    Flujo completo: login → /users/me (200) → logout → /users/me sin cookie (401).
    Verifica que el ciclo de sesión funciona de extremo a extremo.
    """
    cookies = register_and_login(client, "logout_flow@test.com")

    # Verificar que estamos autenticados
    client.cookies.update(cookies)
    me_before = client.get("/users/me")
    assert me_before.status_code == 200

    # Hacer logout (borra la cookie del servidor)
    client.post("/login/logout")
    client.cookies.clear()

    # Ahora sin cookie, debe retornar 401
    me_after = client.get("/users/me")
    assert me_after.status_code == 401
