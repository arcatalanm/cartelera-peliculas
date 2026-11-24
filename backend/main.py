import logging
import os
from datetime import date
from pathlib import Path
from typing import Literal

import pymysql
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, TypeAdapter, field_validator

ROOT = Path(__file__).resolve().parent.parent
try:
    from dotenv import load_dotenv
except ImportError:
    logging.getLogger(__name__).warning(
        "python-dotenv no está instalado; se usarán las variables del proceso. "
        "Instala backend/requirements.txt para cargar archivos .env."
    )
else:
    load_dotenv(ROOT / "backend" / ".env")
    load_dotenv(ROOT / ".env")

app = FastAPI(title="CineGO API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origen.strip() for origen in os.getenv("CORS_ORIGINS", "").split(",") if origen.strip()],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def get_connection():
    return pymysql.connect(
        host=os.environ["DB_HOST"],
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASS"),
        database=os.getenv("DB_NAME", "cartelera_db"),
        cursorclass=pymysql.cursors.DictCursor,
        charset="utf8mb4",
        connect_timeout=5,
    )


class PeliculaCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    titulo: str = Field(min_length=1, max_length=200)
    director: str | None = Field(default=None, max_length=150)
    anio_estreno: int | None = Field(default=None, ge=1888, le=date.today().year + 5, strict=True)
    duracion: int | None = Field(default=None, ge=1, le=1440, strict=True)
    clasificacion: Literal["TE", "TE+7", "+14", "+16", "+18"] = "TE"
    sinopsis: str | None = Field(default=None, max_length=300)
    descripcion_completa: str | None = Field(default=None, max_length=20000)
    en_cartelera: bool = Field(default=True, strict=True)
    portada_url: str = Field(min_length=1, max_length=500)
    id_genero: int = Field(gt=0, strict=True)

    @field_validator("portada_url")
    @classmethod
    def validar_url(cls, valor):
        from urllib.parse import urlsplit
        TypeAdapter(HttpUrl).validate_python(valor)
        url = urlsplit(valor)
        if not url.netloc or url.username or url.password or any(caracter.isspace() for caracter in valor):
            raise ValueError("La portada debe ser una URL http o https válida.")
        return valor

    @field_validator("descripcion_completa")
    @classmethod
    def validar_descripcion(cls, valor):
        if valor and len(valor.encode("utf-8")) > 65535:
            raise ValueError("La descripción supera el tamaño admitido por la base de datos.")
        return valor


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "storage": "mysql",
    }


@app.get("/generos")
def listar_generos():
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM Generos ORDER BY nombre ASC")
            return cursor.fetchall()
    finally:
        conn.close()


@app.get("/peliculas")
def listar_peliculas(incluir_inactivas: bool = False):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT p.*, g.nombre AS genero FROM Peliculas p "
                "INNER JOIN Generos g ON p.id_genero = g.id_genero "
                + ("" if incluir_inactivas else "WHERE p.en_cartelera = TRUE ")
                + "ORDER BY p.id_pelicula DESC"
            )
            return cursor.fetchall()
    finally:
        conn.close()


@app.post("/peliculas", status_code=201)
def crear_pelicula(pelicula: PeliculaCreate):
    generos = {g["id_genero"]: g["nombre"] for g in listar_generos()}
    if pelicula.id_genero not in generos:
        raise HTTPException(422, "Selecciona un género existente.")
    try:
        datos = pelicula.model_dump()
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id_pelicula FROM Peliculas WHERE titulo = %s AND anio_estreno <=> %s LIMIT 1",
                    (datos["titulo"], datos["anio_estreno"]),
                )
                if cursor.fetchone():
                    raise HTTPException(409, "Ya existe una película con ese título y año.")
                columnas = ("titulo", "director", "anio_estreno", "duracion", "clasificacion", "sinopsis", "descripcion_completa", "en_cartelera", "portada_url", "id_genero")
                cursor.execute(
                    "INSERT INTO Peliculas (" + ", ".join(columnas) + ") VALUES (" + ", ".join(["%s"] * len(columnas)) + ")",
                    tuple(datos[columna] for columna in columnas),
                )
                datos["id_pelicula"] = cursor.lastrowid
                datos["genero"] = generos[datos["id_genero"]]
            conn.commit()
            return datos
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    except Exception as error:
        if isinstance(error, HTTPException):
            raise
        logging.getLogger(__name__).exception("No se pudo crear la película")
        raise HTTPException(503, "No se pudo guardar la película. Revisa el almacenamiento e inténtalo otra vez.") from error
