from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.schemas.user import UserCreate, UserRead
from app.models.user import User
from app.dependencies import get_db
from app.core.security import get_password_hash

# APIRouter agrupa endpoints bajo un prefijo común.
# Todos los endpoints de este archivo quedan disponibles bajo /users/*
# y aparecen agrupados como "Usuarios" en la documentación /docs.
router = APIRouter(prefix="/users", tags=["Usuarios"])


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)) -> UserRead:
    """Registra un nuevo usuario en el sistema.

    Verifica que el email no esté en uso, hashea la contraseña
    y persiste el usuario en la base de datos.

    Args:
        user_in: Datos del usuario a registrar (email, contraseña, nombre, rol).
                 FastAPI toma el JSON del request y lo valida automáticamente
                 contra el schema UserCreate antes de llegar aquí.
        db: Sesión de base de datos inyectada por FastAPI via Depends(get_db).
            No la llamamos nosotros — FastAPI la provee y la cierra al terminar.

    Returns:
        El usuario creado. FastAPI aplica response_model=UserRead como filtro:
        solo expone los campos definidos en ese schema (excluye hashed_password).

    Raises:
        HTTPException(400): Si el email ya está registrado en el sistema.

    Dependencies:
        - get_password_hash: Hashea la contraseña antes de persistirla.
        - get_db: Provee y cierra la sesión de BD automáticamente.
    """
    # Flujo: JSON del frontend → validado por UserCreate → llega aquí como user_in
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        # HTTPException interrumpe la ejecución y devuelve el error al cliente.
        # El código debajo de esta línea nunca se ejecuta si esto se lanza.
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

    db.add(new_user)    # Encola el INSERT, aún no toca la BD
    db.commit()         # Ejecuta el INSERT en la BD
    db.refresh(new_user)  # El id fue generado por la BD; refresh lo trae de vuelta al objeto

    # FastAPI serializa new_user usando UserRead antes de responder:
    # convierte el objeto SQLAlchemy a JSON mostrando solo los campos permitidos (response_model=UserRead).
    return new_user


@router.get("/", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db)) -> list[UserRead]:
    """Devuelve todos los usuarios registrados en el sistema.

    Args:
        db: Sesión de base de datos inyectada por FastAPI via Depends(get_db).

    Returns:
        Lista de usuarios con sus datos públicos (sin contraseñas).
        FastAPI aplica response_model=list[UserRead] como filtro sobre cada ítem.

    Dependencies:
        - get_db: Provee y cierra la sesión de BD automáticamente.
    """
    return db.query(User).all()
