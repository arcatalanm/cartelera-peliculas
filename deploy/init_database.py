"""Inicializa RDS desde EC2; coordina instancias con un bloqueo de MySQL."""

import os
from pathlib import Path

import pymysql
from dotenv import load_dotenv
from pymysql.constants import CLIENT

ROOT = Path(__file__).resolve().parent.parent


def inicializar(conn, sql):
    with conn.cursor() as cursor:
        cursor.execute("SELECT GET_LOCK('cinego_schema_v1', 120)")
        if cursor.fetchone()[0] != 1:
            raise RuntimeError("No se pudo obtener el bloqueo de inicializacion de RDS.")
        try:
            cursor.execute(
                "CREATE DATABASE IF NOT EXISTS cartelera_db "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
            conn.select_db("cartelera_db")
            cursor.execute(
                "CREATE TABLE IF NOT EXISTS _cinego_bootstrap "
                "(id TINYINT PRIMARY KEY, estado VARCHAR(16) NOT NULL)"
            )
            cursor.execute("SELECT estado FROM _cinego_bootstrap WHERE id = 1")
            estado = cursor.fetchone()
            if estado:
                if estado[0] == "completo":
                    print("RDS ya inicializado; no se repiten los datos semilla.")
                    return
                raise RuntimeError(
                    "Hay una inicializacion incompleta. Revisar RDS antes de reintentar; "
                    "no se borran ni sobrescriben tablas automaticamente."
                )

            cursor.execute(
                "SELECT TABLE_NAME FROM information_schema.TABLES "
                "WHERE TABLE_SCHEMA = 'cartelera_db' "
                "AND TABLE_NAME IN ('Generos', 'Peliculas')"
            )
            tablas = {fila[0] for fila in cursor.fetchall()}
            if tablas:
                if tablas != {"Generos", "Peliculas"}:
                    raise RuntimeError("El esquema existente esta incompleto; revisar RDS.")
                print("Las tablas ya existen; se conservan sus datos sin ejecutar schema.sql.")
                return

            # DDL hace commits implicitos en MySQL: la marca permite detectar un fallo parcial.
            cursor.execute("INSERT INTO _cinego_bootstrap VALUES (1, 'iniciado')")
            conn.commit()
            cursor.execute(sql)
            while cursor.nextset():
                pass
            cursor.execute("UPDATE _cinego_bootstrap SET estado = 'completo' WHERE id = 1")
            conn.commit()
            print("RDS inicializado con sql/schema.sql.")
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.execute("SELECT RELEASE_LOCK('cinego_schema_v1')")


def main():
    load_dotenv(ROOT / "backend" / ".env")
    if os.environ.get("DB_NAME", "cartelera_db") != "cartelera_db":
        raise RuntimeError("sql/schema.sql utiliza DB_NAME=cartelera_db.")
    sql = (ROOT / "sql" / "schema.sql").read_text(encoding="utf-8-sig")
    # La conexion inicial no selecciona una base: puede que aun no exista.
    conn = pymysql.connect(
        host=os.environ["DB_HOST"],
        port=int(os.environ.get("DB_PORT", "3306")),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASS"],
        charset="utf8mb4",
        connect_timeout=15,
        client_flag=CLIENT.MULTI_STATEMENTS,
    )
    try:
        inicializar(conn, sql)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
