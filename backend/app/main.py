from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import user as user_router
from app.routers import login as login_router

app = FastAPI(
    title="Support App API",
    description="API para la aplicación de soporte",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registramos el router que acabamos de crear
app.include_router(user_router.router)
app.include_router(login_router.router)

@app.get("/health")
def health():
    """Endpoint de salud simple para monitoreo de Render."""
    return {"status": "ok"}
