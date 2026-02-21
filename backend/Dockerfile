# Imagen oficial ligera
FROM python:3.12-slim

# Evita archivos .pyc y mejora logs
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Directorio de trabajo
WORKDIR /app

# Copiar dependencias primero (mejora cache)
COPY requirements.txt .

# Instalar dependencias
RUN pip install --no-cache-dir  --upgrade pip -r requirements.txt

# Copiar el resto del código
COPY . .

# Exponer puerto (Render usa 10000 por defecto, pero puede ser dinámico)
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT"]