"""
routers/message.py — Endpoints de Mensajes y WebSocket de Chat

Este módulo contiene dos tipos de comunicación:

1. HTTP REST (carga inicial):
   GET /tickets/{ticket_id}/messages
   → Devuelve el historial completo de mensajes al abrir la página.
   → Es una petición normal: cliente pregunta, servidor responde, conexión cierra.

2. WebSocket (tiempo real):
   WS /ws/tickets/{ticket_id}
   → Abre un canal bidireccional persistente para el chat en vivo.
   → El servidor puede enviar mensajes al cliente sin que este los pida.
   → Gestiona: autenticación, persistencia en BD, y broadcast a todos los conectados.

Flujo de lectura recomendado:
  models/message.py → schemas/message.py → ws_manager.py → este archivo → ChatBox.tsx (frontend)

Autenticación en WebSocket:
  A diferencia de los endpoints HTTP que usan Depends(get_current_user),
  los WebSockets manejan la autenticación manualmente leyendo la cookie
  `access_token` del handshake inicial. Si el token es inválido, cerramos
  La omisión de Depends() se debe a que ante un fallo de autenticación, es necesario enviar
  un código de cierre WebSocket (4001) en lugar de un error HTTP 401, el cual no es
  manejado por el protocolo WebSocket.
"""

import json

import jwt
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.security import ALGORITHM
from app.database import SessionLocal
from app.dependencies import get_current_user, get_db
from app.models.message import Message
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.message import MessageCreate, MessageRead
from app.ws_manager import manager

router = APIRouter(tags=["Messages"])


# ---------------------------------------------------------------------------
# Helper: Autenticación manual para WebSocket
# ---------------------------------------------------------------------------

def _authenticate_websocket(websocket: WebSocket, db: Session) -> User | None:
    """
    Autentica al usuario que intenta conectarse via WebSocket.

    Nota sobre el diseño: No se reutiliza Depends(get_current_user) dado que este
    lanza HTTPException(401), una respuesta HTTP no válida una vez completado
    el upgrade a WebSocket. En su lugar, se cierra el WebSocket con el código 4001.

    Lee la cookie `access_token` del header del handshake inicial. El navegador
    envía automáticamente las cookies del dominio al conectar un WebSocket,
    igual que en una petición HTTP normal.

    Args:
        websocket: La conexión WebSocket entrante.
        db:        Sesión de BD para buscar el usuario por ID.

    Returns:
        El objeto User si el token es válido, None si no lo es.
    """
    token_raw = websocket.cookies.get("access_token", "")

    if not token_raw.startswith("Bearer "):
        return None

    token = token_raw.removeprefix("Bearer ")

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        if not user_id_str:
            return None
    except jwt.PyJWTError:
        return None

    return db.query(User).filter(User.id == int(user_id_str)).first()


# ---------------------------------------------------------------------------
# Endpoint HTTP: Historial de mensajes (carga inicial)
# ---------------------------------------------------------------------------

@router.get(
    "/tickets/{ticket_id}/messages",
    response_model=list[MessageRead],
)
def get_messages(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MessageRead]:
    """
    Devuelve el historial completo de mensajes de un ticket, ordenado del más
    antiguo al más reciente.

    Nota arquitectónica: La carga del historial se maneja vía HTTP REST en
    lugar de WebSocket para facilitar la transmisión eficiente de datos en bloque.

    Flujo de ejecución:
        1. Verificación de existencia del ticket.
        2. Validación de permisos de acceso (RBAC).
        3. Consulta SQL con `joinedload` para cargar mensajes y autores
           simultáneamente y mitigar el problema N+1 queries.
        4. Serialización de resultados a través de Pydantic.

    Args:
        ticket_id:    ID del ticket cuyos mensajes se solicitan (viene de la URL).
        db:           Sesión de BD inyectada por Depends(get_db).
        current_user: Usuario autenticado inyectado por Depends(get_current_user).

    Returns:
        list[MessageRead]: Lista de mensajes con datos de autor anidados.
                           Vacía si el ticket no tiene mensajes aún.

    Raises:
        HTTPException(404): Si el ticket no existe.
        HTTPException(403): Si un cliente intenta ver mensajes de un ticket ajeno.
        HTTPException(401): Si el usuario no está autenticado.
    """
    # 1. Verificar existencia del ticket
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    # 2. Restricción de acceso: los clientes (rol 3) solo ven sus propios tickets
    if current_user.role_id == 3 and ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes acceso a este ticket")

    # 3. Consultar mensajes con JOIN al autor para evitar N+1 queries
    messages = (
        db.query(Message)
        .options(joinedload(Message.author))  # JOIN: trae User de cada mensaje en 1 query
        .filter(Message.ticket_id == ticket_id)
        .order_by(Message.created_at.asc())  # Orden cronológico (el más viejo primero)
        .all()
    )

    return messages


# ---------------------------------------------------------------------------
# Endpoint WebSocket: Canal de chat en tiempo real
# ---------------------------------------------------------------------------

@router.websocket("/ws/tickets/{ticket_id}")
async def websocket_chat(
    websocket: WebSocket,
    ticket_id: int,
) -> None:
    """
    Canal WebSocket bidireccional para el chat en tiempo real de un ticket.

    El endpoint se define como `async def` para soportar operaciones de entrada/salida
    (I/O) no bloqueantes inherentes a las comunicaciones WebSocket.

    Ciclo de vida de la conexión:
        1. HANDSHAKE: El navegador envía un request HTTP con header `Upgrade: websocket`.
                      El servidor acepta con websocket.accept() completando el upgrade.
        2. AUTENTICACIÓN: Verificación de la cookie JWT del handshake para identificar al usuario.
                          Si es inválida, cerramos con código 4001.
        3. AUTORIZACIÓN: Verificamos que el usuario tenga acceso al ticket.
        4. REGISTRO: Añadimos el WebSocket al ConnectionManager del ticket.
        5. BUCLE: Recepción asíncrona de mensajes del cliente en un bucle infinito.
                  Por cada mensaje: persistencia en base de datos y broadcast a los usuarios conectados.
        6. DESCONEXIÓN: Al cerrar la pestaña, WebSocketDisconnect se lanza
                        automáticamente y eliminamos la conexión del manager.

    Protocolo de mensajes (JSON):
        Cliente → Servidor: {"content": "<mensaje de texto>"}
        Servidor → Clientes: {"type": "chat_message", "id": 1, "content": "...", "author": {...}, ...}

    Eventos especiales que el servidor puede broadcast:
        {"type": "ticket_assigned",   "assigned_to": {"id": X, "email": "...", "full_name": "..."}}
        {"type": "ticket_unassigned"}

    Args:
        websocket: La conexión WebSocket entrante.
        ticket_id: ID del ticket (viene de la URL /ws/tickets/5).
    """
    # Crear una sesión de BD manualmente (no podemos usar Depends en WebSockets fácilmente)
    db: Session = SessionLocal()

    try:
        # --- FASE 1: AUTENTICACIÓN ---
        current_user = _authenticate_websocket(websocket, db)
        if not current_user:
            # Código 4001: convención propia = no autorizado
            # (WebSocket no tiene códigos estándar para auth como HTTP 401)
            await websocket.close(code=4001, reason="No autenticado")
            return

        # --- FASE 2: AUTORIZACIÓN ---
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            await websocket.close(code=4004, reason="Ticket no encontrado")
            return

        # Los clientes (rol 3) solo pueden conectarse a sus propios tickets
        if current_user.role_id == 3 and ticket.user_id != current_user.id:
            await websocket.close(code=4003, reason="Sin acceso a este ticket")
            return

        # --- FASE 3: REGISTRO Y ACEPTACIÓN ---
        # connect() llama a websocket.accept() internamente → completa el handshake
        await manager.connect(websocket, ticket_id)

        # --- FASE 4: BUCLE DE MENSAJES ---
        while True:
            # Esperar el próximo mensaje del cliente (bloquea aquí de forma async)
            raw_data = await websocket.receive_text()

            # Parsear el JSON enviado por el cliente
            try:
                payload = json.loads(raw_data)
            except json.JSONDecodeError:
                continue  # Ignorar datos mal formados

            content = payload.get("content", "").strip()
            if not content:
                continue  # Ignorar mensajes vacíos

            # Persistir el mensaje en la base de datos
            new_message = Message(
                content=content,
                is_system=False,    # Los mensajes humanos nunca son de sistema
                ticket_id=ticket_id,
                author_id=current_user.id,
            )
            db.add(new_message)
            db.commit()
            db.refresh(new_message)  # Trae el id y created_at autogenerados

            # Construir el payload de respuesta (mismo formato que MessageRead)
            broadcast_payload = {
                "type": "chat_message",
                "id": new_message.id,
                "content": new_message.content,
                "is_system": new_message.is_system,
                "ticket_id": new_message.ticket_id,
                "author_id": new_message.author_id,
                "author": {
                    "id": current_user.id,
                    "email": current_user.email,
                    "full_name": current_user.full_name,
                },
                "created_at": new_message.created_at.isoformat(),
            }

            # Enviar a TODOS los usuarios conectados a este ticket (incluido el remitente)
            await manager.broadcast(broadcast_payload, ticket_id)

    except WebSocketDisconnect:
        # El usuario cerró la pestaña o perdió conexión
        # disconnect() limpia el registro en el ConnectionManager
        manager.disconnect(websocket, ticket_id)

    finally:
        # Siempre cerrar la sesión de BD, sin importar cómo terminó el bucle
        db.close()
