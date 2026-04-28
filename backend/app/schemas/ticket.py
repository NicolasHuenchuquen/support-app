import datetime
from pydantic import BaseModel, Field


class TicketCreate(BaseModel):
    """
    Schema de entrada para crear un nuevo ticket de soporte.

    Validado automáticamente por FastAPI antes de que el request
    llegue al endpoint. Si algún campo no cumple las reglas, FastAPI
    retorna HTTP 422 (Unprocessable Entity) con el detalle del error.

    Attributes:
        title:       Título corto y descriptivo del problema.
        description: Detalle completo del incidente o solicitud.
        priority_id: ID de la prioridad (debe existir en la tabla `priorities`).
    """

    title: str = Field(
        ...,
        min_length=5,
        max_length=255,
        description="Título del ticket (entre 5 y 255 caracteres).",
    )
    description: str = Field(
        ...,
        min_length=10,
        description="Descripción detallada del problema (mínimo 10 caracteres).",
    )
    priority_id: int = Field(
        ...,
        gt=0,
        description="ID de la prioridad. Debe ser un entero mayor a 0.",
    )


class TicketRead(BaseModel):
    """
    Schema de salida para exponer los datos públicos de un ticket.

    FastAPI usa este schema como filtro (response_model) para serializar
    el objeto SQLAlchemy `Ticket` a JSON. Solo los campos definidos aquí
    son incluidos en la respuesta — ningún campo interno de la BD escapa.

    Attributes:
        id:           Identificador único del ticket generado por la BD.
        title:        Título del ticket.
        description:  Descripción del problema.
        status:       Estado actual: 'open', 'in_progress' o 'closed'.
        priority_id:  ID de la prioridad asociada.
        user_id:      ID del usuario que creó el ticket.
        created_at:   Timestamp UTC de creación del ticket.
        updated_at:   Timestamp UTC de la última actualización.
    """

    id: int
    title: str
    description: str
    status: str
    priority_id: int
    user_id: int
    # Permite al frontend saber si este ticket ya fue tomado por un administrador/técnico
    assigned_technician_id: int | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    # `model_config` le dice a Pydantic que puede leer los datos directamente
    # desde un objeto SQLAlchemy (ORM), no solo desde diccionarios.
    model_config = {"from_attributes": True}
