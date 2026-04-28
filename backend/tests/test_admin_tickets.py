"""
test_admin_tickets.py
=====================
Pruebas para los endpoints de administración de tickets:
  - GET  /tickets/{id}           → Ver un ticket específico
  - GET  /tickets/all            → Listar todos (solo admin/técnico)
  - PATCH /tickets/{id}/assign   → Asignar ticket al técnico logueado
  - PATCH /tickets/{id}/unassign → Devolver ticket a la bandeja

Roles del sistema (role_id), según seed data (002_seed_data.py):
  1 = Administrador  → pasa el check de get_current_admin_user
  2 = Técnico        → pasa el check de get_current_admin_user
  3 = Cliente        → bloqueado en endpoints de admin (403)
"""
from tests.conftest import register_and_login


def _create_ticket(client, cookies: dict, title="Test Ticket", priority_id=1) -> dict:
    """
    Crea un ticket autenticado y retorna el JSON del ticket creado.
    Las cookies se inyectan al cliente antes del request.
    """
    client.cookies.update(cookies)
    res = client.post(
        "/tickets/",
        json={"title": title, "description": "Descripción de prueba", "priority_id": priority_id},
    )
    client.cookies.clear()
    assert res.status_code == 201, f"Error al crear ticket: {res.text}"
    return res.json()


# ---------------------------------------------------------------------------
# Tests: GET /tickets/{id}
# ---------------------------------------------------------------------------

def test_get_ticket_by_id_as_owner(client):
    """Un cliente puede ver su propio ticket por ID."""
    cookies = register_and_login(client, "owner@test.com", role_id=1)
    ticket = _create_ticket(client, cookies)

    client.cookies.update(cookies)
    res = client.get(f"/tickets/{ticket['id']}")
    client.cookies.clear()

    assert res.status_code == 200
    assert res.json()["id"] == ticket["id"]


def test_get_ticket_by_id_as_admin(client):
    """Un técnico puede ver cualquier ticket, incluso los de otro usuario."""
    client_cookies = register_and_login(client, "cl_owner@test.com", role_id=1)
    ticket = _create_ticket(client, client_cookies, title="Ticket del cliente")

    admin_cookies = register_and_login(client, "admin_reader@test.com", role_id=2)
    client.cookies.update(admin_cookies)
    res = client.get(f"/tickets/{ticket['id']}")
    client.cookies.clear()

    assert res.status_code == 200
    assert res.json()["title"] == "Ticket del cliente"


def test_get_ticket_by_id_forbidden_for_other_client(client):
    """Un cliente NO puede ver el ticket de otro cliente → 403."""
    owner_cookies = register_and_login(client, "owner2@test.com", role_id=2)
    ticket = _create_ticket(client, owner_cookies)

    otro_cookies = register_and_login(client, "otro_cliente@test.com", role_id=3)
    client.cookies.update(otro_cookies)
    res = client.get(f"/tickets/{ticket['id']}")
    client.cookies.clear()

    assert res.status_code == 403


def test_get_ticket_by_id_not_found(client):
    """Un ID de ticket inexistente retorna 404."""
    admin_cookies = register_and_login(client, "admin_404@test.com", role_id=2)
    client.cookies.update(admin_cookies)
    res = client.get("/tickets/99999")
    client.cookies.clear()

    assert res.status_code == 404


def test_get_ticket_unauthenticated(client):
    """Sin cookie, cualquier GET /tickets/{id} retorna 401."""
    res = client.get("/tickets/1")
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# Tests: GET /tickets/all (solo admins)
# ---------------------------------------------------------------------------

def test_get_all_tickets_as_admin(client):
    """Un técnico puede listar todos los tickets del sistema."""
    client_cookies = register_and_login(client, "cl_for_all@test.com", role_id=1)
    _create_ticket(client, client_cookies, title="Ticket visible para admin")

    admin_cookies = register_and_login(client, "admin_all@test.com", role_id=2)
    client.cookies.update(admin_cookies)
    res = client.get("/tickets/all")
    client.cookies.clear()

    assert res.status_code == 200
    assert isinstance(res.json(), list)
    assert len(res.json()) >= 1


def test_get_all_tickets_forbidden_for_client(client):
    """Un cliente normal NO puede acceder a /tickets/all → 403."""
    client_cookies = register_and_login(client, "client_forbidden@test.com", role_id=3)
    client.cookies.update(client_cookies)
    res = client.get("/tickets/all")
    client.cookies.clear()

    assert res.status_code == 403


def test_get_all_tickets_unauthenticated(client):
    """Sin cookie, /tickets/all retorna 401."""
    res = client.get("/tickets/all")
    assert res.status_code == 401


def test_get_all_tickets_with_status_filter(client):
    """El filtro status_filter=open devuelve solo tickets con ese estado."""
    client_cookies = register_and_login(client, "cl_filter@test.com", role_id=1)
    _create_ticket(client, client_cookies, title="Ticket para filtrar")

    admin_cookies = register_and_login(client, "admin_filter@test.com", role_id=2)
    client.cookies.update(admin_cookies)
    res = client.get("/tickets/all?status_filter=open")
    client.cookies.clear()

    assert res.status_code == 200
    for t in res.json():
        assert t["status"] == "open"


# ---------------------------------------------------------------------------
# Tests: PATCH /tickets/{id}/assign
# ---------------------------------------------------------------------------

def test_assign_ticket_success(client):
    """Un técnico puede asignarse un ticket: pasa de 'open' a 'in_progress'."""
    client_cookies = register_and_login(client, "cl_assign@test.com", role_id=1)
    ticket = _create_ticket(client, client_cookies, title="Ticket a asignar")
    assert ticket["status"] == "open"

    admin_cookies = register_and_login(client, "tech_assign@test.com", role_id=2)
    client.cookies.update(admin_cookies)
    res = client.patch(f"/tickets/{ticket['id']}/assign")
    client.cookies.clear()

    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "in_progress"
    assert data["assigned_technician_id"] is not None


def test_assign_ticket_forbidden_for_client(client):
    """Un cliente común NO puede asignarse tickets → 403."""
    client_cookies = register_and_login(client, "cl_assign_forbid@test.com", role_id=3)
    ticket = _create_ticket(client, client_cookies)

    client.cookies.update(client_cookies)
    res = client.patch(f"/tickets/{ticket['id']}/assign")
    client.cookies.clear()

    assert res.status_code == 403


def test_assign_nonexistent_ticket(client):
    """Asignar un ticket que no existe → 404."""
    admin_cookies = register_and_login(client, "admin_assign_404@test.com", role_id=2)
    client.cookies.update(admin_cookies)
    res = client.patch("/tickets/99998/assign")
    client.cookies.clear()

    assert res.status_code == 404


# ---------------------------------------------------------------------------
# Tests: PATCH /tickets/{id}/unassign
# ---------------------------------------------------------------------------

def test_unassign_ticket_success(client):
    """Después de asignar, el técnico puede devolverlo → vuelve a 'open'."""
    client_cookies = register_and_login(client, "cl_unassign@test.com", role_id=1)
    ticket = _create_ticket(client, client_cookies, title="Ticket a desasignar")

    admin_cookies = register_and_login(client, "tech_unassign@test.com", role_id=2)

    # Asignar primero
    client.cookies.update(admin_cookies)
    client.patch(f"/tickets/{ticket['id']}/assign")

    # Luego desasignar
    res = client.patch(f"/tickets/{ticket['id']}/unassign")
    client.cookies.clear()

    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "open"
    assert data["assigned_technician_id"] is None


def test_unassign_ticket_forbidden_for_client(client):
    """Un cliente NO puede desasignar tickets → 403."""
    client_cookies = register_and_login(client, "cl_unassign_forbid@test.com", role_id=3)
    ticket = _create_ticket(client, client_cookies)

    client.cookies.update(client_cookies)
    res = client.patch(f"/tickets/{ticket['id']}/unassign")
    client.cookies.clear()

    assert res.status_code == 403
