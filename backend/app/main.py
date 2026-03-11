from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import user as user_router

app = FastAPI(
    title="Support App API",
    description="API para la aplicación de soporte",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registramos el router que acabamos de crear
app.include_router(user_router.router)

@app.get("/health")
def health():
    db_info = settings.DATABASE_URL.split("@")[-1]
    return {"status": "ok", "db_info": db_info}
