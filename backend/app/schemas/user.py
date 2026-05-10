from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
# BASE: Campos comunes para lectura y escritura
# ─────────────────────────────────────────────────────────────────────────────
class UserBase(BaseModel):
    # Viene del modelo: email: Mapped[str] (unique, index, nullable=False)
    email: EmailStr

    # Viene del modelo: full_name: Mapped[Optional[str]]
    # Optional[str] = None → puede no enviarse, por eso tiene valor por defecto
    full_name: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# CREATE: Datos recibidos durante el registro de usuario
# Hereda los campos de UserBase y agrega password y role_id
# ─────────────────────────────────────────────────────────────────────────────
class UserCreate(UserBase):
    # Contraseña en texto plano provista por el cliente.
    # Será procesada mediante hash previo almacenamiento.
    password: str

    # role_id 3 = Cliente (valor por defecto para registro público).
    # Técnicos (2) y Administradores (1) deben asignarse manualmente desde la BD.
    role_id: int = 3


# ─────────────────────────────────────────────────────────────────────────────
# READ: Datos expuestos en las respuestas de la API
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

    # Habilita a Pydantic para mapear directamente desde modelos de SQLAlchemy
    # en lugar de requerir diccionarios nativos de Python
    model_config = ConfigDict(from_attributes=True)
