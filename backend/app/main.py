from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.core.config import settings
from app.routers import login as login_router
from app.routers import user as user_router
from app.routers import ticket as ticket_router
from app.routers import message as message_router

# ---------------------------------------------------------------------------
# Configuración del Rate Limiter Global
# ---------------------------------------------------------------------------

# El Limiter global se adjunta a la app. Cada router puede usar su propio
# Limiter local con distintas claves (IP o user ID), pero todos comparten
# el mismo middleware que intercepta las respuestas 429.
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Support App API",
    description="API para la aplicación de soporte técnico",
    version="1.0.0",
)

# Dar acceso al limiter desde el estado de la app (requerido por slowapi)
app.state.limiter = limiter

# Middleware que intercepta los errores RateLimitExceeded y retorna HTTP 429
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ---------------------------------------------------------------------------
# CORS (Cross-Origin Resource Sharing)
# ---------------------------------------------------------------------------

# CORS le indica al navegador qué orígenes (dominios) pueden hacer requests
# a esta API. En desarrollo: localhost:3000 (Next.js). En producción: el dominio real.
#
# ⚠️ SEGURIDAD: `allow_credentials=True` es necesario para que el navegador
# envíe cookies en requests cross-origin. Requiere que `allow_origins` sea
# una lista explícita (nunca "*" cuando hay credenciales).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,  # Permite el envío de cookies en requests cross-origin
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(user_router.router)
app.include_router(login_router.router)
app.include_router(ticket_router.router)
app.include_router(message_router.router)  # Endpoints de mensajes y WebSocket de chat


# ---------------------------------------------------------------------------
# Endpoints de sistema
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Sistema"])
def health():
    """
    Endpoint de salud para monitoreo externo (ej. Render, UptimeRobot).

    Retorna HTTP 200 si el servidor está corriendo correctamente.
    No requiere autenticación. No tiene rate limit ya que su volumen
    de llamadas es bajo y controlado por el sistema de monitoreo.

    Returns:
        dict: Objeto JSON con el estado del servidor.
    """
    return {"status": "ok"}
