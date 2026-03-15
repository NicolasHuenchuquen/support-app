import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from app.core.config import settings

# Algoritmo de firma para el JWT
ALGORITHM = "HS256"
# Tiempo de vida del token (ej. 30 minutos)
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def get_password_hash(password: str) -> str:
    """Genera un hash seguro para una contraseña en texto plano.

    Usa el algoritmo bcrypt con un salt aleatorio generado automáticamente.

    Args:
        password: Contraseña en texto plano provista por el usuario.

    Returns:
        Hash bcrypt de la contraseña, listo para persistir en la BD.
    """
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si una contraseña en texto plano coincide con su hash.

    Usado durante el proceso de login para autenticar al usuario.

    Args:
        plain_password: Contraseña ingresada por el usuario al hacer login.
        hashed_password: Hash almacenado en la base de datos.

    Returns:
        True si la contraseña coincide con el hash, False en caso contrario.
    """
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Crea y firma un Json Web Token (JWT).
    
    Args:
        data: Diccionario con los datos útiles (payload) como el ID del usuario.
        expires_delta: Tiempo de validez del token. Si no se provee, usa el default.
        
    Returns:
        Un string alfanumérico largo que representa el JWT firmado.
    """
    to_encode = data.copy()
    
    # 1. Definir la fecha de expiración
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
    # 2. Añadir la fecha de expiración ('exp') al payload (estándar JWT)
    to_encode.update({"exp": expire})
    
    # 3. Generar la firma matemática usando la clave secreta del .env
    # A un hacker le es imposible generar esta misma firma sin conocer SECRET_KEY
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt
