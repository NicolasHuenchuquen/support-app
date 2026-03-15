# 🛠️ Support App - Sistema de Gestión de Tickets

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.135-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

Bienvenido al repositorio de **Support App**, un proyecto _Full-Stack_ diseñado estructuralmente bajo estándares y metodologías de la industria. 

Más allá de ser un sistema funcional de gestión de tickets de soporte técnico, la visión principal de este proyecto es servir como un **campo de pruebas exhaustivo** para dominar el ecosistema moderno de desarrollo web. Específicamente, une la potencia y UX del cliente web con React/Next.js y el alto rendimiento del backend utilizando Python/FastAPI.

---

## 🎯 Visión del Proyecto y Enfoque de Aprendizaje

Si estás revisando este código para aprender, nota que este proyecto no es el típico "to-do list" o tutorial básico. Está arquitectado para resolver problemas reales que encontrarás a nivel _Semi-Senior/Senior_ y en producción:

1. **Separación de Responsabilidades (Microservicios Lógicos):** En lugar de un monolito fuertemente acoplado, el Front y el Back son aplicaciones independientes que se comunican estrictamente a través de una API RESTful documentada de forma automática (Swagger/OpenAPI).
2. **Tipado Estricto de Extremo a Extremo:** Usamos **TypeScript** en el frontend (junto con `zod` para validación de schemas de formularios) y **Python Type Hints + Pydantic** en el backend. Esto reduce drásticamente los errores en tiempo de ejecución garantizando la integridad de los datos.
3. **Seguridad y Autenticación:** Se implementa un flujo real de autenticación mediante JSON Web Tokens (JWT) asimétricos o simétricos, control de roles y _hashing_ robusto de contraseñas con `bcrypt`.
4. **Infraestructura como Código (IaC) y Contenedores:** El proyecto está orquestado para Docker (`infra-backend`, `infra-frontend`), lo que significa que el entorno de despliegue y desarrollo es determinista. El clásico "funciona en mi máquina" está resuelto desde el día cero.

---

## 💻 Tech Stack: Arquitectura y Decisiones Tecnológicas

A continuación se detalla por qué elegimos estas herramientas específicas para escalar la aplicación.

### 🎨 Frontend: La Revolución de React y SSR
El frontend, ubicado en el directorio `/frontend`, está construido para ser ágil, reactivo y optimizado para motores de búsqueda (SEO).

* **[Next.js 16](https://nextjs.org/) (App Router):** Elegido por su inigualable soporte de Server-Side Rendering (SSR) y Static Site Generation (SSG). Nos permite definir layouts complejos y optimizar la carga inicial (First Contentful Paint) separando componentes de cliente (`"use client"`) y de servidor.
* **[React 19](https://react.dev/):** Utilizando el ecosistema más maduro de componentes funcionales y _hooks_.
* **[Tailwind CSS v4](https://tailwindcss.com/):** Elegido por su metodología "Utility-First" que permite mantener un diseño completamente responsivo y atómico desde el mismo archivo `.tsx` sin lidiar con colisiones de selectores en los estilos CSS tradicionales.
* **[React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/):** Manejo eficiente del ciclo de vida de formularios hiper-complejos. Combinado con Zod, nos asegura que jamás enviemos una petición HTTP al backend sin que la data haya sido firmemente comprobada a nivel cliente.

### ⚙️ Backend: Interoperabilidad y Velocidad Asíncrona en Python
El backend (en `/backend`) es el cerebro de la lógica de negocio y gestión de estados.

* **[FastAPI](https://fastapi.tiangolo.com/):** Framework moderno, hiperrápido (al nivel de NodeJS o Go) basado en los estándares ASGI. Su capacidad nativa asíncrona lo hace ideal para alta concurrencia. Gracias a su autogeneración de documentación (Swagger UI), el equipo de Frontend siempre tiene la especificación exacta de la API.
* **[SQLAlchemy 2.0](https://www.sqlalchemy.org/):** El ORM (Object-Relational Mapper) pilar de Python. A través de este ORM abstractamos queries SLQ puras y nos protegemos contra Inyecciones SQL, aplicando el patrón Unit of Work y modelado de datos relacionables de manera limpia.
* **[Alembic](https://alembic.sqlalchemy.org/):** Control de versiones del esquema de base de datos. Controla la evolución y migraciones de manera programática.
* **[Pydantic V2](https://docs.pydantic.dev/):** La frontera de la validación. Transforma y certifica payloads entrantes y salientes. Si el frontend envía un dato anómalo, Pydantic lo revierte inmediatamente con un error de respuesta claro HTTP 422 (Unprocessable Entity).
* **[PostgreSQL](https://www.postgresql.org/):** Motor de base de datos OLTP relacional, interactuando con drivers como `psycopg2-binary` y abstracciones asíncronas (`asyncpg`).

---

## 📂 Estructura del Ecosistema (Monorepo)

```text
support-app/
├── backend/            # API RESTful en Python
│   ├── app/            # Código fuente (routers, schemas, models, services)
│   ├── alembic/        # Historial de migraciones SQL
│   ├── Dockerfile      # Empaquetado de la API
│   └── requirements.txt
├── frontend/           # Aplicación Web Next.js Web App
│   ├── src/app/        # Páginas y layout global (Page system de App Router)
│   ├── .env            # Variables de entorno cliente
│   └── package.json
├── infra-backend/      # Archivos Docker Compose y configs de la BD e API
└── infra-frontend/     # Archivos Docker Compose para despliegue del Front
```

---

## 🚀 Guía Rápida para Levantar Entornos y Contribuir

La forma más mantenible y aislada de correr el ecosistema es usando contenedores Docker. 

### Opción 1: Desarrollo con Docker (Recomendado)
Asegúrate de tener [Docker y Docker Compose](https://www.docker.com/products/docker-desktop/) instalados en tu máquina.

1. **Levantar la Infraestructura Backend (incluye la API Rest y la Base de Datos):**
   ```bash
   cd infra-backend
   docker-compose up -d
   ```
2. **Levantar la Infraestructura Frontend (opcional para desarrollo local si prefieres `npm run dev`):**
   ```bash
   cd infra-frontend
   docker-compose up -d
   ```

### Opción 2: Desarrollo Local Nativo

#### 1. Correr el Backend (FastAPI + Python)
Navega al directorio backend (`cd backend`), luego:
1. Crea tu entorno virtual: `python -m venv venv`
2. Actívalo:
   * Windows: `venv\Scripts\activate`
   * Linux/Mac: `source venv/bin/activate`
3. Instala dependencias: `pip install -r requirements.txt`
4. Aplica las migraciones (tu BD PostgreSQL de Docker debe estar viva): `alembic upgrade head`
5. Levanta el server de desarrollo: `uvicorn app.main:app --reload`
* API Documentada estará accesible en: `http://localhost:8000/docs`*

#### 2. Correr el Frontend (Next.js)
Navega al frontend (`cd frontend`):
1. Copia `.env.example` a `.env` (si aplica) y configura el `NEXT_PUBLIC_API_URL`.
2. Instala todos los paquetes de node: `npm install`
3. Levanta el servidor hot-reload de Next: `npm run dev`
*Tu app estará en: `http://localhost:3000`*

---

> **Nota:** Este proyecto evoluciona constantemente priorizando *buenas prácticas, arquitectura de software limpia y mantenibilidad* a largo plazo en su fase iterativa, evitando soluciones "rápidas".