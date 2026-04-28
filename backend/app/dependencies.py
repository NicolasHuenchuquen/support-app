from typing import Generator, TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User

import jwt
from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import ALGORITHM
from app.database import SessionLocal


# ---------------------------------------------------------------------------
# Dependencia de Base de Datos
# ---------------------------------------------------------------------------

def get_db() -> Generator[Session, None, None]:
    """
    Crea y provee una sesión de base de datos para cada request HTTP.

    FastAPI llama automáticamente a esta función gracias a `Depends(get_db)`.
    El bloque `finally` garantiza que la sesión siempre se cierre al terminar
    el request, incluso si ocurre un error.

    Yields:
        Session: Sesión SQLAlchemy activa para interactuar con la BD.

    Dependencies:
        - SessionLocal: Fábrica de sesiones creada en database.py.
    """
    db = SessionLocal()
    try:
        # yield le 'presta' la sesión al endpoint y pausa aquí la función.
        # El endpoint hace su trabajo y cuando termina, el código de abajo continúa.
        yield db
    finally:
        # Se ejecuta siempre al final, sin importar si hubo error o no.
        db.close()


# ---------------------------------------------------------------------------
# Dependencia de Autenticación
# ---------------------------------------------------------------------------

def get_current_user(
    access_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
):
    """
    Extrae y valida el usuario autenticado a partir de la cookie JWT.

    Esta función actúa como un "guardia de seguridad" en cada endpoint
    protegido. FastAPI la ejecuta automáticamente antes de entrar al
    endpoint cuando se declara como `Depends(get_current_user)`.

    Flujo interno:
        1. Lee la cookie `access_token` del navegador del usuario.
        2. Verifica que la cookie exista y tenga el formato 'Bearer <token>'.
        3. Decodifica el JWT usando la clave secreta del servidor.
        4. Extrae el `sub` (user ID) del payload del token.
        5. Busca y retorna el usuario en la base de datos.

    Args:
        access_token: Cookie HTTP-only enviada automáticamente por el
                      navegador. FastAPI la extrae del header SET-COOKIE.
                      Valor `None` si el usuario no inició sesión.
        db:           Sesión de BD inyectada por `Depends(get_db)`.

    Returns:
        User: Instancia del modelo SQLAlchemy del usuario autenticado.

    Raises:
        HTTPException(401): En cualquiera de estos casos:
            - La cookie no existe (usuario no inició sesión).
            - El formato de la cookie no es 'Bearer <token>'.
            - El JWT está vencido o fue manipulado (firma inválida).
            - El user ID del token no corresponde a ningún usuario en la BD.

    Dependencies:
        - jwt: Para decodificar y verificar la firma del token.
        - settings.SECRET_KEY: Clave privada del servidor, nunca expuesta al cliente.
        - get_db: Para consultar la BD y obtener el objeto User completo.

    Notes:
        El header `WWW-Authenticate: Bearer` le indica al cliente (ej. Postman)
        que este endpoint espera autenticación de tipo Bearer token.
    """
    # Credencial estándar para responder errores de autenticación.
    # Le dice al cliente: "este endpoint requiere un token Bearer".
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado o sesión expirada",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Verificar que la cookie exista
    if not access_token:
        raise credentials_exception

    # 2. La cookie tiene el formato "Bearer <jwt_token>", extraer solo el token
    if not access_token.startswith("Bearer "):
        raise credentials_exception
    token = access_token.removeprefix("Bearer ")

    try:
        # 3. Decodificar el JWT: esto verifica la firma y la expiración.
        #    Si el token fue alterado o venció, jwt.decode lanza una excepción.
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])

        # 4. El campo 'sub' (subject) contiene el ID del usuario, guardado al crear el token.
        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception

    except jwt.PyJWTError:
        # Captura cualquier error de JWT: token vencido, firma inválida, etc.
        raise credentials_exception

    # 5. Buscar el usuario real en la BD para retornarlo con todos sus datos actuales
    from app.models.user import User  # Import local para evitar ciclos de importación
    user = db.query(User).filter(User.id == int(user_id_str)).first()

    if user is None:
        raise credentials_exception

    return user


# ---------------------------------------------------------------------------
# Dependencia de Autorización (Roles)
# ---------------------------------------------------------------------------

def get_current_admin_user(current_user: "User" = Depends(get_current_user)):
    """
    Verifica que el usuario autenticado tenga rol de Administrador (1) o Técnico (2).
    
    FastAPI usa inyección de dependencias encadenadas: primero se ejecuta
    get_current_user, y si es exitoso, pasa el resultado a esta función.
    
    Args:
        current_user: El usuario autenticado, resultado de get_current_user.
        
    Returns:
        User: El mismo usuario si tiene privilegios.
        
    Raises:
        HTTPException(403): Si el usuario es un cliente normal (rol 3) intentando
                            acceder a un endpoint bloqueado.
    """
    # 1: Administrador, 2: Técnico, 3: Cliente
    if current_user.role_id not in [1, 2]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para realizar esta acción.",
        )
    return current_user
