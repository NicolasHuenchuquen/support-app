from pydantic import BaseModel, EmailStr
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
# BASE: campos comunes que siempre usamos en lectura y escritura
# ─────────────────────────────────────────────────────────────────────────────
class UserBase(BaseModel):
    # Viene del modelo: email: Mapped[str] (unique, index, nullable=False)
    email: EmailStr

    # Viene del modelo: full_name: Mapped[Optional[str]]
    # Optional[str] = None → puede no enviarse, por eso tiene valor por defecto
    full_name: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# CREATE: lo que recibimos del frontend al REGISTRAR un usuario
# Hereda los campos de UserBase y agrega password y role_id
# ─────────────────────────────────────────────────────────────────────────────
class UserCreate(UserBase):
    # El frontend manda la contraseña en texto plano.
    # En el router la hashearemos antes de guardarla en hashed_password.
    password: str

    # Viene del modelo: role_id: Mapped[int] (ForeignKey → roles.id, nullable=False)
    # Por defecto ponemos 2 asumiendo que 1=admin y 2=usuario/cliente
    role_id: int = 2


# ─────────────────────────────────────────────────────────────────────────────
# READ: lo que DEVOLVEMOS al frontend después de crear o consultar un usuario
# Hereda UserBase y expone los campos generados por la BD (id, flags, role_id)
# ─────────────────────────────────────────────────────────────────────────────
class UserRead(UserBase):
    # Viene del modelo: id: Mapped[int] (primary_key)
    id: int

    # Viene del modelo: is_active: Mapped[bool] (default=True)
    is_active: bool

    # Viene del modelo: role_id: Mapped[int] (ForeignKey → roles.id)
    role_id: int

    # NO se incluye hashed_password por seguridad

    class Config:
        # Permite que Pydantic lea directamente un objeto SQLAlchemy (modelo de BD)
        # Sin esto, solo podría leer diccionarios simples de Python
        from_attributes = True
