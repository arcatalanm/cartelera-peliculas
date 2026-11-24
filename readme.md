# Cartelera de Películas

Aplicación web desarrollada con **React + Vite + Tailwind CSS** (Frontend), **FastAPI** (Backend), **Amazon RDS MySQL** (Base de datos) y **Amazon S3** (Almacenamiento de portadas).

## 📁 Estructura del Proyecto

```text
cartelera-peliculas/
├── .gitignore               # Ignora .env, __pycache__/, node_modules/, dist/
├── README.md                # Documentación, dependencias y pasos de despliegue
├── backend/
│   ├── main.py              # API con FastAPI cargando variables desde .env
│   └── .env.example         # Plantilla de variables de conexión a RDS
├── frontend/
│   ├── vite.config.js       # Plugin de Tailwind CSS v4
│   └── src/
│       ├── index.css        # Importe de Tailwind (@import "tailwindcss";)
│       ├── main.jsx         # Punto de entrada con BrowserRouter
│       ├── App.jsx          # Enrutador principal (Routes) + Navbar
│       ├── services/
│       │   └── api.js       # Instancia de Axios y llamadas HTTP al backend
│       ├── components/
│       │   ├── Navbar.jsx         # Barra superior fija tipo con Link
│       │   ├── PeliculaCard.jsx   # Tarjeta individual con Link a /pelicula/:id
│       │   └── AgregarPelicula.jsx   # Formulario para crear película en RDS
│       └── pages/
│           ├── Home.jsx           # Cartelera completa con filtro por género
│           └── PeliculaDetalle.jsx # Vista detallada de una película por :id
└── sql/
    └── schema.sql           # Script de creación de tablas Generos y Peliculas + datos semilla

## Dependencias del Backend (Python)
```bash
pip install fastapi uvicorn pymysql pydantic python-dotenv
```

## Dependencias del Frontend (React y Utilidades)
```bash
npm install axios react-router-dom
npm install -D tailwindcss @tailwindcss/vite
```

## Despliegue Básico
1. **Base de datos:** Ejecutar `sql/schema.sql` en la instancia de Amazon RDS MySQL.
2. **Backend:** Copiar `backend/.env.example` a `backend/.env`, completar credenciales de RDS y levantar con:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```
3. **Frontend:** Compilar los archivos estáticos dentro de `frontend/`:
   ```bash
   npm run build
   ```