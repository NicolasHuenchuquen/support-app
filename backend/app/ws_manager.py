"""
ws_manager.py — Gestor de Conexiones WebSocket (Singleton Global)

Diseño de la Arquitectura:
  Este módulo abstrae la gestión de conexiones en un Singleton para que sea 
  accesible desde diferentes enrutadores (message.py, ticket.py) sin 
  incurrir en dependencias circulares.

Uso típico en otros módulos:
    from app.ws_manager import manager
    await manager.broadcast({"type": "chat_message", ...}, ticket_id=5)
"""

import json
from typing import Dict, List

from fastapi import WebSocket


class ConnectionManager:
    """
    Gestiona todas las conexiones WebSocket activas, organizadas por ticket.

    Internamente usa un diccionario:
        {ticket_id: [websocket_usuario_a, websocket_usuario_b, ...]}

    Esta estructura permite una búsqueda eficiente de las conexiones asociadas a un ticket
    específico para la transmisión de mensajes, evitando iterar sobre conexiones ajenas.

    Attributes:
        active_connections: Mapa de ticket_id → lista de WebSockets activos.
    """

    def __init__(self) -> None:
        # Diccionario: clave = ticket_id (int), valor = lista de WebSockets activos
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, ticket_id: int) -> None:
        """
        Acepta una nueva conexión WebSocket y la registra para el ticket indicado.

        El método `accept()` completa el handshake HTTP→WebSocket. Sin él,
        la conexión queda en estado pendiente y el cliente no puede enviar datos.

        Args:
            websocket: El objeto WebSocket de la nueva conexión entrante.
            ticket_id: ID del ticket al que se conecta el usuario.
        """
        await websocket.accept()

        # Inicializar la lista para este ticket si aún no existe
        if ticket_id not in self.active_connections:
            self.active_connections[ticket_id] = []

        self.active_connections[ticket_id].append(websocket)

    def disconnect(self, websocket: WebSocket, ticket_id: int) -> None:
        """
        Elimina una conexión WebSocket del registro cuando el usuario se desconecta.

        Este evento se desencadena ante la desconexión del cliente (cierre de pestaña, navegación, pérdida de red).
        FastAPI captura el evento WebSocketDisconnect y procede con la limpieza del registro.

        Al agotarse las conexiones de un ticket, su entrada es removida del diccionario
        para optimizar la asignación de memoria.

        Args:
            websocket: El WebSocket a eliminar.
            ticket_id: El ID del ticket del que se desconecta.
        """
        if ticket_id not in self.active_connections:
            return

        # Eliminar el WebSocket específico de la lista
        connections = self.active_connections[ticket_id]
        if websocket in connections:
            connections.remove(websocket)

        # Limpiar la entrada si no quedan conexiones para este ticket
        if not self.active_connections[ticket_id]:
            del self.active_connections[ticket_id]

    async def broadcast(self, data: dict, ticket_id: int) -> None:
        """
        Envía un mensaje JSON a TODOS los usuarios conectados a un ticket específico.

        Itera sobre cada WebSocket registrado para el ticket e intenta enviar el
        mensaje. Si una conexión está rota (el cliente cerró sin notificar),
        la captura y la elimina del registro para evitar acumulación de conexiones
        fantasma que desperdiciarían recursos del servidor.

        Args:
            data:      Diccionario Python que será serializado a JSON y enviado.
                       Debe incluir al menos: {"type": "chat_message" | "ticket_assigned" | ...}
            ticket_id: ID del ticket cuyos usuarios recibirán el mensaje.
        """
        if ticket_id not in self.active_connections:
            return  # Nadie conectado a este ticket, nada que hacer

        # Identificar conexiones rotas para limpiarlas después del loop
        dead_connections: List[WebSocket] = []

        for websocket in self.active_connections[ticket_id]:
            try:
                # send_json serializa el dict a JSON automáticamente
                await websocket.send_json(data)
            except Exception:
                # Identificación de conexión rota
                dead_connections.append(websocket)

        # Limpieza de conexiones inactivas fuera del iterador para evitar mutación de la lista en curso
        for dead in dead_connections:
            self.disconnect(dead, ticket_id)


# ---------------------------------------------------------------------------
# Instancia Singleton — se crea UNA SOLA VEZ al cargar el módulo
# ---------------------------------------------------------------------------
# Todas las importaciones de `manager` desde este módulo compartirán
# la misma instancia, garantizando un registro unificado y consistente.
manager = ConnectionManager()
