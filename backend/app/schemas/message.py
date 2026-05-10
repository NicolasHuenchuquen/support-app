"""
schemas/message.py — Schemas Pydantic para el modelo Message

Los schemas de Pydantic definen la "forma" del JSON que entra y sale de la API.
Son la barrera de seguridad real del servidor (a diferencia de los types de
TypeScript que solo guían al desarrollador en el editor).

Flujo de lectura recomendado para entender este módulo:
  1. models/message.py     → estructura de la tabla en PostgreSQL
  2. schemas/message.py    → forma del JSON de entrada/salida (este archivo)
  3. routers/message.py    → endpoints que usan estos schemas
"""

import datetime
from typing import Optional

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    """
    Schema de ENTRADA para crear un nuevo mensaje en un ticket.

    Solo se necesita el contenido porque los demás campos (ticket_id, author_id,
    is_system, timestamps) los infiere el servidor desde el contexto del request:
      - ticket_id  → viene de la URL del endpoint (/tickets/{ticket_id}/...)
      - author_id  → viene del JWT en la cookie (usuario autenticado)
      - is_system  → siempre False para mensajes creados por humanos vía este schema
      - created_at → la BD lo genera automáticamente

    Attributes:
        content: El texto del mensaje. Mínimo 1 caracter para evitar mensajes vacíos.
    """

    content: str = Field(..., min_length=1, description="Contenido del mensaje")


class MessageAuthor(BaseModel):
    """
    Schema anidado que representa al autor de un mensaje.

    Diseño: El anidamiento directo de la entidad `Author` evita el problema de
    N+1 peticiones HTTP desde el frontend, proporcionando todos los datos
    necesarios para la renderización de la interfaz (ej. nombre e email)
    en una sola respuesta inicial.

    Attributes:
        id:        ID del usuario autor.
        email:     Email del usuario (usado como fallback si full_name es None).
        full_name: Nombre completo del usuario. Puede ser None si el usuario
                   no lo ha configurado en su perfil.
    """

    id: int
    email: str
    full_name: Optional[str] = None

    # from_attributes=True le dice a Pydantic que puede construir este schema
    # desde un objeto SQLAlchemy (message.author) además de desde un dict.
    model_config = {"from_attributes": True}


class MessageRead(BaseModel):
    """
    Schema de SALIDA para devolver un mensaje con todos sus datos al frontend.

    Incluye el objeto 'author' anidado con nombre y email para que el frontend
    pueda mostrar el autor sin requests adicionales.

    Integración con SQLAlchemy:
    El campo `author` utiliza `from_attributes=True` para permitir a Pydantic
    extraer los datos de la relación Mapped["User"] del modelo SQLAlchemy
    (obtenidos eficientemente vía `joinedload`). Dado que los nombres de los
    atributos coinciden, no se requiere configuración manual adicional.

    Attributes:
        id:         ID autoincremental del mensaje en la BD.
        content:    Texto del mensaje.
        is_system:  True si fue generado automáticamente por el sistema
                    (ej. "Ticket asignado a X"). False si lo escribió un humano.
        ticket_id:  ID del ticket al que pertenece el mensaje.
        author_id:  ID numérico del autor (útil para comparar con currentUser.id en el frontend).
        author:     Objeto anidado con id, email y full_name del autor.
                    Pydantic lo lee directamente de message.author (relación SQLAlchemy).
        created_at: Timestamp de creación, para ordenar y mostrar la hora del mensaje.
    """

    id: int
    content: str
    is_system: bool
    ticket_id: int
    author_id: int
    author: Optional[MessageAuthor] = None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
