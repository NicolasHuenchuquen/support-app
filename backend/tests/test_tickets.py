"""
test_tickets.py
===============
Pruebas para los endpoints básicos de tickets del cliente:
  - POST /tickets/   → crear ticket (autenticado y sin autenticar)
  - GET  /tickets/me → listar mis tickets
"""
from tests.conftest import register_and_login


def test_create_ticket_unauthenticated(client):
    """Verifica que no se pueden crear tickets sin iniciar sesión → 401."""
    res = client.post(
        "/tickets/",
        json={"title": "Help", "description": "Need help", "priority_id": 1}
    )
    assert res.status_code == 401


def test_create_ticket_success(client):
    """Verifica que un usuario autenticado puede crear un ticket y leerlo en su lista."""
    cookies = register_and_login(client, "ticketuser@test.com", role_id=1)

    # Crear el ticket
    client.cookies.update(cookies)
    response = client.post(
        "/tickets/",
        json={
            "title": "Falla técnica en inventario",
            "description": "El sistema se cuelga al abrir",
            "priority_id": 2
        },
    )
    assert response.status_code == 201, response.text
    ticket_data = response.json()
    assert ticket_data["title"] == "Falla técnica en inventario"
    assert ticket_data["status"] == "open"

    # Obtener la lista de tickets del usuario
    list_res = client.get("/tickets/me")
    client.cookies.clear()

    assert list_res.status_code == 200
    my_tickets = list_res.json()
    assert len(my_tickets) >= 1
    assert any(t["id"] == ticket_data["id"] for t in my_tickets)
