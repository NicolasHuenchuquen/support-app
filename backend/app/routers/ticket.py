from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.ticket import TicketCreate, TicketRead

# ---------------------------------------------------------------------------
# Configuración del Rate Limiter para este router
# ---------------------------------------------------------------------------

# `get_remote_address` es la función por defecto de slowapi que extrae la IP.
# En los endpoints públicos (sin login) usar IP es la única opción disponible.
# En endpoints autenticados usamos una función personalizada que usa el user ID
# del JWT, lo cual es más justo (dos personas en la misma oficina no comparten límite).
_limiter = Limiter(key_func=get_remote_address)


def _limit_by_user_id(request: Request) -> str:
    """
    Función clave para el rate limiter en endpoints autenticados.

    En lugar de usar la IP (que puede ser compartida por muchos usuarios
    detrás de un router de empresa o universidad), usa el ID del usuario
    extraído directamente de la cookie JWT.

    Esto garantiza que el límite es por PERSONA, no por red.

    Args:
        request: El objeto Request de FastAPI, que contiene las cookies.

    Returns:
        El user ID como string para usar como clave del bucket de rate limit.
        Si no hay cookie, retorna la IP como fallback (para el caso extremo
        donde alguien llama al endpoint sin autenticar).
    """
    # Leer la cookie JWT (misma lógica que get_current_user)
    token_raw = request.cookies.get("access_token", "")
    if token_raw.startswith("Bearer "):
        import jwt
        from app.core.config import settings
        from app.core.security import ALGORITHM
        try:
            payload = jwt.decode(
                token_raw.removeprefix("Bearer "),
                settings.SECRET_KEY,
                algorithms=[ALGORITHM],
            )
            user_id = payload.get("sub")
            if user_id:
                # Prefijo para diferenciar en los logs de slowapi
                return f"user:{user_id}"
        except Exception:
            pass
    # Fallback: usar IP si el token es inválido o no existe
    return get_remote_address(request)


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/tickets", tags=["Tickets"])


@router.post(
    "/",
    response_model=TicketRead,
    status_code=status.HTTP_201_CREATED,
)
@_limiter.limit("10/minute", key_func=_limit_by_user_id)
def create_ticket(
    request: Request,
    ticket_in: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TicketRead:
    """
    Crea un nuevo ticket de soporte para el usuario autenticado.

    El usuario se obtiene automáticamente del JWT en la cookie, por lo que
    no necesita enviar su ID en el cuerpo. El sistema lo asocia solo.

    Rate limit: 10 tickets por minuto por usuario (identificado por user ID del JWT).
    Este límite previene que un usuario malintencionado inunde el sistema con tickets.

    Args:
        request:      Objeto Request de FastAPI (requerido por slowapi para rate limiting).
        ticket_in:    Datos del ticket validados por Pydantic (título, descripción, prioridad).
        db:           Sesión de BD inyectada por `Depends(get_db)`.
        current_user: Usuario autenticado inyectado por `Depends(get_current_user)`.
                      Si la cookie no existe o expiró, FastAPI retorna 401 automáticamente.

    Returns:
        TicketRead: El ticket recién creado con todos sus campos, incluyendo el ID
                    asignado por la BD y los timestamps de creación.

    Raises:
        HTTPException(401): Si el usuario no está autenticado.
        HTTPException(422): Si los datos del ticket no cumplen las validaciones del schema.
        HTTPException(429): Si el usuario supera el límite de 10 tickets por minuto.

    Dependencies:
        - get_current_user: Extrae y valida el JWT de la cookie HTTP-only.
        - get_db: Provee y cierra la sesión de BD.
        - TicketCreate: Schema Pydantic que valida los datos de entrada.
        - TicketRead: Schema Pydantic usado por FastAPI para filtrar la respuesta.
    """
    # Crear la instancia del modelo SQLAlchemy con los datos validados
    new_ticket = Ticket(
        title=ticket_in.title,
        description=ticket_in.description,
        priority_id=ticket_in.priority_id,
        user_id=current_user.id,  # Se asocia automáticamente al usuario del token
        status="open",            # Todo ticket nuevo empieza como 'open'
    )

    db.add(new_ticket)     # Prepara el INSERT en memoria
    db.commit()            # Ejecuta el INSERT en la BD
    db.refresh(new_ticket) # Trae de la BD los campos autogenerados (id, timestamps)

    return new_ticket


@router.get(
    "/me",
    response_model=list[TicketRead],
)
@_limiter.limit("60/minute", key_func=_limit_by_user_id)
def get_my_tickets(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TicketRead]:
    """
    Retorna todos los tickets (activos y resueltos) del usuario autenticado.

    El frontend puede luego filtrar por `status` en el cliente para mostrar
    las secciones de 'Activos' ('open', 'in_progress') y 'Resueltos' ('closed').

    Rate limit: 60 requests por minuto por usuario. El límite es más alto que
    el de creación porque es una operación de solo lectura (no modifica datos)
    y el usuario podría refrescar la vista con frecuencia.

    Args:
        request:      Objeto Request de FastAPI (requerido por slowapi).
        db:           Sesión de BD inyectada por `Depends(get_db)`.
        current_user: Usuario autenticado extraído del JWT en la cookie.

    Returns:
        list[TicketRead]: Lista de todos los tickets del usuario ordenados
                          del más reciente al más antiguo (desc created_at).
                          Lista vacía si el usuario no tiene tickets.

    Raises:
        HTTPException(401): Si el usuario no está autenticado.
        HTTPException(429): Si el usuario supera 60 requests por minuto.

    Dependencies:
        - get_current_user: Verifica la sesión y provee el usuario.
        - get_db: Provee la sesión de BD.
    """
    tickets = (
        db.query(Ticket)
        .filter(Ticket.user_id == current_user.id)
        .order_by(Ticket.created_at.desc())  # Los más nuevos primero
        .all()
    )
    return tickets
