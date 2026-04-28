from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    FRONTEND_URL: str = "http://localhost:3000"
    # "production" activa cookies seguras para cross-site (Vercel → Render).
    # Cualquier otro valor (o ausencia) se trata como entorno local.
    ENVIRONMENT: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        #como no hay .env en /backend, revisa en el sistema y las usa (contenedor DOCKER).
    )

settings = Settings()