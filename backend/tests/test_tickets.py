def test_create_ticket_unauthenticated(client):
    """Verifica que no se pueden crear tickets sin iniciar sesión."""
    response = client.post(
        "/tickets/",
        json={"title": "Help", "description": "Need help", "priority_id": 1}
    )
    # 401: No autenticado
    assert response.status_code == 401

def test_create_ticket_success(client):
    """Verifica que un usuario autenticado puede crear un ticket y leerlo en su lista."""
    # 1. Crear usuario
    client.post(
        "/users/", 
        json={"email": "ticketuser@test.com", "password": "Password123!"}
    )
    
    # 2. Iniciar sesión para obtener la cookie
    login_res = client.post(
        "/login/token", 
        data={"username": "ticketuser@test.com", "password": "Password123!"}
    )
    # Extraer la cookie "access_token" enviada por el servidor
    cookies = login_res.cookies
    
    # 3. Crear el ticket enviando la cookie
    response = client.post(
        "/tickets/",
        json={
            "title": "Falla técnica en inventario", 
            "description": "El sistema se cuelga al abrir", 
            "priority_id": 2
        },
        cookies=cookies
    )
    assert response.status_code == 201, response.text
    ticket_data = response.json()
    assert ticket_data["title"] == "Falla técnica en inventario"
    assert ticket_data["status"] == "open"

    # 4. Obtener la lista de los tickets del usuario
    list_res = client.get("/tickets/me", cookies=cookies)
    assert list_res.status_code == 200
    my_tickets = list_res.json()
    assert len(my_tickets) == 1
    assert my_tickets[0]["id"] == ticket_data["id"]
