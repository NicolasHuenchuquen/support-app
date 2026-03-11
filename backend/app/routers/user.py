from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.user import UserCreate, UserRead
from app.models.user import User
from app.dependencies import get_db

# Creamos el "Router". Es como un mini-app que solo maneja usuarios.
router = APIRouter(prefix="/users", tags=["Usuarios"])

from app.core.security import get_password_hash

@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Este endpoint permite registrar un nuevo usuario.
    1. Recibe el JSON y Pydantic lo valida usando 'UserCreate'.
    2. Verifica que el email no esté ya en la base de datos.
    3. Hashea la contraseña para guardarla de forma segura.
    4. Crea el registro y lo guarda.
    """
    
    # Buscamos si ya existe alguien con ese email
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este email ya está en uso"
        )

    # Creamos la instancia del modelo SQLAlchemy con la contraseña hasheada
    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role_id=user_in.role_id,
        is_active=True
    )

    # Guardamos en la base de datos
    db.add(new_user)
    db.commit()      # Guardar cambios
    db.refresh(new_user)  # Traer los datos generados (como el ID)

    return new_user

@router.get("/", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db)):
    """
    Simplemente trae todos los usuarios de la base de datos.
    """
    users = db.query(User).all()
    return users
