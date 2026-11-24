import unittest
from unittest.mock import MagicMock

from deploy.init_database import inicializar


class InicializacionTest(unittest.TestCase):
    def setUp(self):
        self.conn = MagicMock()
        self.cursor = self.conn.cursor.return_value.__enter__.return_value
        self.cursor.nextset.return_value = None
        self.sql = "CREATE TABLE Generos (id INT); INSERT INTO Generos VALUES (1);"

    def ejecutadas(self):
        return [llamada.args[0] for llamada in self.cursor.execute.call_args_list]

    def test_base_nueva_ejecuta_semillas_y_marca_completa(self):
        self.cursor.fetchone.side_effect = [(1,), None]
        self.cursor.fetchall.return_value = []
        inicializar(self.conn, self.sql)
        self.assertIn(self.sql, self.ejecutadas())
        self.assertIn("UPDATE _cinego_bootstrap SET estado = 'completo' WHERE id = 1", self.ejecutadas())
        self.assertEqual(self.ejecutadas()[-1], "SELECT RELEASE_LOCK('cinego_schema_v1')")

    def test_instancia_posterior_no_repite_semillas(self):
        self.cursor.fetchone.side_effect = [(1,), ("completo",)]
        inicializar(self.conn, self.sql)
        self.assertNotIn(self.sql, self.ejecutadas())

    def test_tablas_existentes_conservan_sus_datos(self):
        self.cursor.fetchone.side_effect = [(1,), None]
        self.cursor.fetchall.return_value = [("Generos",), ("Peliculas",)]
        inicializar(self.conn, self.sql)
        self.assertNotIn(self.sql, self.ejecutadas())

    def test_fallo_parcial_no_se_da_por_completado(self):
        self.cursor.fetchone.side_effect = [(1,), ("iniciado",)]
        with self.assertRaisesRegex(RuntimeError, "incompleta"):
            inicializar(self.conn, self.sql)
        self.assertNotIn(self.sql, self.ejecutadas())
        self.conn.rollback.assert_called_once()

    def test_sin_bloqueo_no_modifica_la_base(self):
        self.cursor.fetchone.return_value = (0,)
        with self.assertRaisesRegex(RuntimeError, "bloqueo"):
            inicializar(self.conn, self.sql)
        self.assertEqual(len(self.ejecutadas()), 1)

    def test_error_sql_revierte_y_libera_bloqueo(self):
        self.cursor.fetchone.side_effect = [(1,), None]
        self.cursor.fetchall.return_value = []
        def ejecutar(sql):
            if sql == self.sql:
                raise RuntimeError("Fallo SQL")
        self.cursor.execute.side_effect = ejecutar
        with self.assertRaisesRegex(RuntimeError, "Fallo SQL"):
            inicializar(self.conn, self.sql)
        self.conn.rollback.assert_called_once()
        self.assertEqual(self.ejecutadas()[-1], "SELECT RELEASE_LOCK('cinego_schema_v1')")


if __name__ == "__main__":
    unittest.main()
