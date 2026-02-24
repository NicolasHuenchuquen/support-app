from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str

    model_config = SettingsConfigDict(
        env_file=".env", # Carga las variables del archivo .env que este en /backend
        #como no hay .env en /backend, revisa en el sistema y las usa (contenedor DOCKER).
    )

settings = Settings()

    
