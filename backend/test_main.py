import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from pydantic import ValidationError

from backend import main


class PeliculasTest(unittest.TestCase):
    def setUp(self):
        self.conn = MagicMock()
        self.cursor = self.conn.cursor.return_value.__enter__.return_value
        self.cursor.fetchall.return_value = [{"id_genero": 1, "nombre": "Acción"}]
        self.cursor.fetchone.return_value = None
        self.cursor.lastrowid = 9
        conexion = patch.object(main, "get_connection", return_value=self.conn)
        conexion.start()
        self.addCleanup(conexion.stop)

    def crear(self, **campos):
        datos = {"titulo": "Una historia", "id_genero": 1, "portada_url": "https://example.com/portada.webp", **campos}
        return main.crear_pelicula(main.PeliculaCreate(**datos))

    def test_persistencia_y_campos_de_la_tabla(self):
        creada = self.crear(duracion=120, anio_estreno=2024, sinopsis="Sinopsis", descripcion_completa="Historia completa")
        self.assertEqual(creada["id_pelicula"], 9)
        self.conn.commit.assert_called_once()
        self.assertEqual(self.cursor.execute.call_args.args[1][0], "Una historia")
        self.assertEqual(creada["duracion"], 120)
        self.assertEqual(creada["descripcion_completa"], "Historia completa")

    def test_filtro_de_cartelera_en_mysql(self):
        main.listar_peliculas()
        self.assertIn("WHERE p.en_cartelera = TRUE", self.cursor.execute.call_args.args[0])
        main.listar_peliculas(incluir_inactivas=True)
        self.assertNotIn("WHERE", self.cursor.execute.call_args.args[0])

    def test_validaciones_y_limites(self):
        for campo in [
            {"titulo": "  "}, {"titulo": "x" * 201}, {"director": "x" * 151},
            {"duracion": 0}, {"duracion": 1.5}, {"anio_estreno": 1800},
            {"sinopsis": "x" * 301}, {"descripcion_completa": "x" * 20001},
            {"id_genero": 0}, {"clasificacion": "cualquiera"},
            {"portada_url": "javascript:alert(1)"}, {"en_cartelera": "true"},
            {"portada_url": "https://servidor con espacios/imagen.webp"},
            {"descripcion_completa": "🎬" * 17000},
            {"id_pelicula": 99}, {"portada_webp": "contenido"},
        ]:
            with self.subTest(campo=next(iter(campo))), self.assertRaises(ValidationError):
                self.crear(**campo)

    def test_genero_inexistente(self):
        with self.assertRaises(HTTPException) as error:
            self.crear(id_genero=999)
        self.assertEqual(error.exception.status_code, 422)

    def test_conserva_la_url_sin_convertir_o_descargar_imagenes(self):
        url = "https://example.com/portada.jpg?version=2"
        creada = self.crear(portada_url=url)
        self.assertEqual(creada["portada_url"], url)
        self.assertIn(url, self.cursor.execute.call_args.args[1])

    def test_la_url_es_obligatoria(self):
        for valor in [None, "", "   "]:
            with self.subTest(valor=valor), self.assertRaises(ValidationError):
                self.crear(portada_url=valor)
        with self.assertRaises(ValidationError):
            main.PeliculaCreate(titulo="Prueba", id_genero=1)

    def test_duplicado_revierte_la_transaccion(self):
        self.cursor.fetchone.return_value = {"id_pelicula": 9}
        with self.assertRaises(HTTPException) as error:
            self.crear(anio_estreno=2024)
        self.assertEqual(error.exception.status_code, 409)
        self.conn.rollback.assert_called_once()
        self.conn.commit.assert_not_called()

    def test_error_de_persistencia_devuelve_un_motivo(self):
        with patch.object(self.conn, "commit", side_effect=OSError("Sin conexión")):
            with self.assertLogs("backend.main", level="ERROR"), self.assertRaises(HTTPException) as error:
                self.crear()
        self.assertEqual(error.exception.status_code, 503)
        self.conn.rollback.assert_called_once()

    def test_acepta_portadas_de_distintos_dominios(self):
        for url in ["https://example.com/poster.jpg", "https://bucket.s3.amazonaws.com/poster.webp"]:
            with self.subTest(url=url):
                self.assertEqual(self.crear(portada_url=url)["portada_url"], url)


if __name__ == "__main__":
    unittest.main()
