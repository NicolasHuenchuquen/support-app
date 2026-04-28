from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.user import User
from app.core.security import verify_password, create_access_token
from app.core.config import settings


# ---------------------------------------------------------------------------
# Configuración del Rate Limiter
# ---------------------------------------------------------------------------

# Para endpoints de login/logout usamos IP como clave porque el usuario
# aún no tiene un JWT con el que identificarlo.
#
# IMPORTANTE: Este es el límite más estricto de toda la API.
# Un atacante que intenta adivinar contraseñas solo tiene 5 intentos por
# minuto por IP antes de recibir un error HTTP 429 (Too Many Requests).
_limiter = Limiter(key_func=get_remote_address)


# APIRouter agrupa endpoints bajo un prefijo común.
router = APIRouter(prefix="/login", tags=["Login"])


@router.post("/token")
@_limiter.limit("5/minute")
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Autentica un usuario y establece una cookie JWT segura en el navegador.

    FastAPI usa OAuth2PasswordRequestForm que espera los datos como
    'Form Data' (no JSON) con dos campos: `username` (email) y `password`.

    Rate limit: 5 requests por minuto por IP.
    Este límite es crítico: previene ataques de fuerza bruta donde un bot
    intenta miles de combinaciones de contraseñas por segundo.

    Args:
        request:   Objeto Request de FastAPI (requerido por slowapi para rate limiting).
        form_data: Datos del formulario OAuth2 (username=email, password).
                   FastAPI los extrae automáticamente del body del request.
        db:        Sesión de BD inyectada por `Depends(get_db)`.

    Returns:
        Response HTTP 200 con una cookie HTTP-only `access_token` configurada.
        La cookie no es accesible desde JavaScript (protección XSS).

    Raises:
        HTTPException(401): Si el email no existe o la contraseña es incorrecta.
                            Deliberadamente no se distingue cuál de los dos falló
                            para no dar pistas a un atacante.
        HTTPException(400): Si la cuenta del usuario está desactivada.
        HTTPException(429): Si se superan los 5 intentos por minuto desde la misma IP.

    Dependencies:
        - verify_password: Compara la contraseña con el hash bcrypt de la BD.
        - create_access_token: Genera y firma el JWT con el ID y rol del usuario.
        - get_db: Provee la sesión de BD.

    Notes:
        Se usa cookie HttpOnly en lugar de localStorage para evitar exposición
        del token a scripts del cliente (protección XSS).
    """
    # 1. Buscar al usuario en la BD por email (que viene en el campo "username")
    user = db.query(User).filter(User.email == form_data.username).first()

    # 2. Verificar existencia y contraseña en un solo bloque para evitar
    #    "timing attacks" donde el tiempo de respuesta revela si el email existe.
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Verificar que la cuenta esté activa
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo",
        )

    # 4. Crear el JWT con el ID del usuario y su rol como payload
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role_id}
    )

    # En producción (Vercel → Render) la cookie necesita secure=True y samesite="none"
    # para viajar entre dominios distintos. Localmente funciona con secure=False y samesite="lax".
    is_production = settings.ENVIRONMENT == "production"

    response = Response(status_code=status.HTTP_200_OK)
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True, # Bloquea el acceso desde JavaScript (protección XSS)
        secure=is_production, # False para http://localhost. En producción debe ser True (HTTPS)
        samesite="none" if is_production else "lax", # Previene ataques CSRF (Cross-Site Request Forgery)
        max_age=1800, # 30 minutos (igual que el tiempo de vida del token)
    )
    return response


@router.post("/logout", status_code=status.HTTP_200_OK)
@_limiter.limit("10/minute")
def logout(request: Request, response: Response):
    """
    Cierra la sesión del usuario eliminando la cookie JWT del navegador.

    FastAPI no puede "invalidar" el JWT en el servidor porque los tokens
    son stateless (sin estado). La estrategia estándar es pedirle al
    navegador que borre la cookie, lo cual equivale a cerrar sesión.

    Rate limit: 10 requests por minuto por IP. Límite razonable para
    prevenir el uso abusivo del endpoint (aunque tiene bajo riesgo).

    Args:
        request:  Objeto Request de FastAPI (requerido por slowapi).
        response: Objeto Response de FastAPI. Se inyecta para poder
                  modificar las cookies sin perder el control del status code.

    Returns:
        JSON con mensaje de confirmación y la cookie `access_token`
        eliminada del navegador (max_age=0).

    Raises:
        HTTPException(429): Si se superan los 10 intentos por minuto.

    Notes:
        `delete_cookie` con los mismos atributos que `set_cookie` es necesario
        para que el navegador reconozca que es la misma cookie a eliminar.
        Si los atributos no coinciden, algunos navegadores ignoran la eliminación.
    """
    # Sobreescribir la cookie con max_age=0 para que el navegador la elimine
    response.delete_cookie(
        key="access_token",
        httponly=True,
        samesite="lax",
    )
    return {"message": "Sesión cerrada correctamente"}
