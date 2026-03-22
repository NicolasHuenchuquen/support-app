# 🛠️ Support App - Sistema de Gestión de Tickets

> 🚧 **Nota:** Este proyecto se encuentra actualmente **en desarrollo activo**.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.135-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

Bienvenido al repositorio de **Support App**, un proyecto _Full-Stack_ desarrollado paso a paso para aprender y aplicar buenas prácticas de la industria. 

La visión principal de este proyecto es servir como un **espacio de aprendizaje guiado** para dominar el ecosistema moderno de desarrollo web. Específicamente, une la potencia del cliente web con React/Next.js y el rendimiento del backend utilizando Python/FastAPI.

---

## 🎯 Visión del Proyecto y Enfoque de Aprendizaje

Este proyecto fue estructurado desde el día uno para ir más allá de los tutoriales básicos, intentando solucionar problemas reales del día a día de un desarrollador de manera limpia y mantenible:

1. **Arquitectura Desacoplada:** El Front y el Back son aplicaciones completamente independientes que se comunican estrictamente a través de una API RESTful, documentada automáticamente con Swagger/OpenAPI.
2. **Tipado de Extremo a Extremo:** Usamos **TypeScript** en el frontend (junto con `zod` para validación de formularios) y **Python Type Hints + Pydantic** en el backend. Esto reduce drásticamente los errores antes del despliegue.
3. **Seguridad y Accesos Limitados:** El flujo de login está basado en el estándar **OAuth2** (Password Flow) generando **JSON Web Tokens (JWT)** que no se exponen al código JavaScript (previniendo XSS), sino que viajan por defecto en cookies **HttpOnly**. Además, se emplea **SlowAPI** como limitador de peticiones (Rate Limiting) contra ataques de fuerza bruta y se protegen las contraseñas firmándolas criptográficamente mediante `bcrypt`.
4. **Validación Automática (CI/CD):** Se incorporó una suite de pruebas base armada con `pytest`. Dichas pruebas se aíslan levantando su propia base `SQLite` en memoria que se limpia automáticamente tras cada ejecución. Este proceso está configurado en un flujo de **GitLab CI** para rechazar código roto antes de integrarse a `main`.
5. **Infraestructura Contenedorizada:** El proyecto está orquestado para Docker, garantizando que cualquiera pueda levantarlo sin complicaciones por diferencias de sistema operativo.

---

## 💻 Tech Stack: Arquitectura y Herramientas

### 🎨 Frontend: React y SSR
El frontend (ubicado en `/frontend`) está construido para ser ágil y reactivo.

* **[Next.js 16](https://nextjs.org/) (App Router):** Elegido por su soporte de Server-Side Rendering (SSR). Facilita abstraer layouts y realizar validaciones o redirecciones protegidas desde el propio servidor.
* **[React 19](https://react.dev/):** Ecosistema de componentes funcionales y _hooks_.
* **[Tailwind CSS v4](https://tailwindcss.com/):** Elegido por su metodología "Utility-First" que nos permitió estandarizar una paleta de colores limpia (estilo "Dark Mode minimalista") y altamente legible.
* **[React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/):** Para manejar el ciclo de vida de los formularios (login, creación de tickets) y asegurarse de que el backend solo reciba datos validados.

### ⚙️ Backend: Lógica Asíncrona en Python
El backend (en `/backend`) es el cerebro de la lógica de negocio y gestión de datos.

* **[FastAPI](https://fastapi.tiangolo.com/):** Framework hiper-rápido y asíncrono con generación de documentación automática.
* **[SQLAlchemy 2.0](https://www.sqlalchemy.org/):** El motor ORM de Python. Nos ayuda a interactuar con las tablas relacionales de forma segura contra Inyecciones SQL, aplicando modelado de relaciones limpias.
* **[Pydantic V2](https://docs.pydantic.dev/):** Validador central que certifica los _payloads_ antes de iniciar las funciones. Reacciona a inconsistencias con respuestas `422 Unprocessable Entity`.
* **[PostgreSQL](https://www.postgresql.org/):** Base de datos relacional para entornos productivos o de desarrollo.

---

## 📂 Estructura del Ecosistema

```text
support-app/
├── backend/            # API RESTful en Python
│   ├── app/            # Código fuente principal (routers, schemas, models)
│   ├── tests/          # Suite de pruebas Pytest (conftest.py, test_*)
│   ├── alembic/        # Historial de migraciones SQL
│   ├── Dockerfile      # Empaquetado del servicio API
│   └── requirements.txt
├── frontend/           # Aplicación Web (Next.js)
│   ├── src/app/        # Vistas de la interfaz (Login, Dashboard)
│   ├── .env            # Variables de entorno 
│   └── package.json
├── infra-backend/      # Archivos Docker Compose y configs de la BD y la API
├── infra-frontend/     # Archivos Docker Compose para despliegue del Front
└── .gitlab-ci.yml      # Pipeline del Integrador Continuo
```

---

## 🚀 Guía Rápida para Levantar Entornos

La forma más rápida e independiente de correr el ecosistema es usando contenedores Docker, pero la recomendada para contribuir y probar líneas de código es instalándolo nativamente de manera local.

### Opción 1: Desarrollo Local Nativo (Recomendado)

#### 1. Correr el Backend (FastAPI + Python)
Navega al directorio backend (`cd backend`), luego:
1. Crea tu entorno virtual: `python -m venv venv`
2. Actívalo:
   * Windows: `venv\Scripts\activate`
   * Linux/Mac: `source venv/bin/activate`
3. Instala las herramientas: `pip install -r requirements.txt`
4. Aplica las migraciones SQL (tu BD PostgreSQL debe estar en ejecución): `alembic upgrade head`
5. Levanta el servidor local: `uvicorn app.main:app --reload`
> _La API Documentada interactiva estará accesible en: `http://localhost:8000/docs`_

#### 2. Correr el Frontend (Next.js)
Abre otra terminal y navega al frontend (`cd frontend`):
1. Configura tu acceso local si lo necesitas (renombrando `.env.example` a `.env` si aplica). Asegúrate de validar el `NEXT_PUBLIC_API_URL`.
2. Instala los paquetes: `npm install`
3. Inicia el modo de desarrollo: `npm run dev`
> _Tu web app se abrirá en `http://localhost:3000`_

### Opción 2: Arranque Rápido con Docker

Asegúrate de contar con [Docker Desktop](https://www.docker.com/products/docker-desktop/) en tu máquina.

1. **Levantar la Infraestructura Backend (API Rest y BD PostgreSQL):**
   ```bash
   cd infra-backend
   docker-compose up -d
   ```
2. **Levantar la Infraestructura Frontend:**
   ```bash
   cd infra-frontend
   docker-compose up -d
   ```