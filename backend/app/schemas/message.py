import datetime
from pydantic import BaseModel, Field

class MessageCreate(BaseModel):
    """
    Schema de entrada para crear un nuevo mensaje en un ticket.
    
    Attributes:
        content: El texto del mensaje enviado por el usuario o técnico.
    """
    content: str = Field(..., min_length=1)

class MessageRead(BaseModel):
    """
    Schema de salida para devolver un mensaje.
    
    Attributes:
        id: ID autogenerado del mensaje.
        content: El contenido del mensaje (texto normal o notificación).
        ticket_id: El ID del ticket al que pertenece.
        author_id: El ID de quien lo originó.
        is_system: Booleano que indica si es un mensaje de auditoría ("Ticket asignado").
        created_at: Fecha y hora de creación.
    """
    id: int
    content: str
    ticket_id: int
    author_id: int
    is_system: bool
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
