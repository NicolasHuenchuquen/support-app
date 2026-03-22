from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.schemas.user import UserCreate, UserRead
from app.models.user import User
from app.dependencies import get_db
from app.core.security import get_password_hash

# ---------------------------------------------------------------------------
# Configuración del Rate Limiter
# ---------------------------------------------------------------------------

# Para endpoints de registro usamos IP porque el usuario aún no tiene JWT.
# Límite generoso (20/min) ya que el registro es una acción legítima frecuente,
# pero suficiente para frenar bots que intenten crear cuentas masivamente.
_limiter = Limiter(key_func=get_remote_address)


# Todos los endpoints de este archivo quedan disponibles bajo /users/*
# y aparecen agrupados como "Usuarios" en la documentación /docs.
router = APIRouter(prefix="/users", tags=["Usuarios"])


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@_limiter.limit("20/minute")
def register_user(
    request: Request,
    user_in: UserCreate,
    db: Session = Depends(get_db),
) -> UserRead:
    """
    Registra un nuevo usuario en el sistema.

    Verifica que el email no esté en uso, hashea la contraseña con bcrypt
    y persiste el usuario en la base de datos.

    Rate limit: 20 requests por minuto por IP.
    Previene que bots creen cuentas masivamente (account farming).

    Args:
        request:  Objeto Request de FastAPI (requerido por slowapi para rate limiting).
        user_in:  Datos del usuario a registrar (email, contraseña, nombre, rol).
                  FastAPI toma el JSON del request y lo valida automáticamente
                  contra el schema UserCreate antes de llegar aquí.
        db:       Sesión de BD inyectada por `Depends(get_db)`.
                  No la llamamos nosotros — FastAPI la provee y la cierra al terminar.

    Returns:
        UserRead: El usuario creado. FastAPI aplica response_model=UserRead como filtro:
                  solo expone los campos definidos en ese schema (excluye hashed_password).

    Raises:
        HTTPException(400): Si el email ya está registrado en el sistema.
        HTTPException(422): Si los datos no pasan la validación de UserCreate.
        HTTPException(429): Si se superan los 20 registros por minuto desde la misma IP.

    Dependencies:
        - get_password_hash: Hashea la contraseña antes de persistirla (nunca texto plano).
        - get_db: Provee y cierra la sesión de BD automáticamente.
    """
    # Verificar si el email ya existe en la BD antes de intentar insertar
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        # HTTPException interrumpe la ejecución y devuelve el error al cliente.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este email ya está en uso",
        )

    new_user = User(
        email=user_in.email,
        # Nunca se guarda la contraseña en texto plano.
        # get_password_hash convierte "123456" → "$2b$12$..." (bcrypt)
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role_id=user_in.role_id,
        is_active=True,
    )

    db.add(new_user)     # Encola el INSERT, aún no toca la BD
    db.commit()          # Ejecuta el INSERT en la BD
    db.refresh(new_user) # El id fue generado por la BD; refresh lo trae de vuelta al objeto

    # FastAPI serializa new_user usando UserRead antes de responder:
    # convierte el objeto SQLAlchemy a JSON mostrando solo los campos permitidos.
    return new_user


@router.get("/", response_model=list[UserRead])
@_limiter.limit("30/minute")
def list_users(
    request: Request,
    db: Session = Depends(get_db),
) -> list[UserRead]:
    """
    Devuelve todos los usuarios registrados en el sistema.

    Rate limit: 30 requests por minuto por IP. Límite moderado para
    este endpoint de solo lectura.

    Args:
        request: Objeto Request de FastAPI (requerido por slowapi).
        db:      Sesión de BD inyectada por `Depends(get_db)`.

    Returns:
        list[UserRead]: Lista de usuarios con sus datos públicos (sin contraseñas).
                        FastAPI aplica response_model=list[UserRead] como filtro
                        sobre cada ítem de la lista.

    Raises:
        HTTPException(429): Si se superan los 30 requests por minuto.

    Dependencies:
        - get_db: Provee y cierra la sesión de BD automáticamente.
    """
    return db.query(User).all()
