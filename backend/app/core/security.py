import bcrypt


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
