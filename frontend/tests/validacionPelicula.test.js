import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validarPelicula } from '../src/services/validacionPelicula.js'

const generos = [{ id_genero: 1, nombre: 'Acción' }]
const pelicula = { titulo: 'Una historia', director: '', anio_estreno: '', duracion: '', clasificacion: 'TE', sinopsis: '', descripcion_completa: '', id_genero: '1', portada_url: 'https://example.com/portada.jpg' }

test('exige la URL de portada incluso si los otros campos son válidos', () => {
  for (const portada_url of ['', '   ']) {
    assert.match(validarPelicula({ ...pelicula, portada_url }, generos).portada_url, /Escribe la URL/)
  }
})

test('rechaza URLs mal formadas, credenciales y protocolos no admitidos', () => {
  for (const portada_url of ['javascript:alert(1)', 'file:///imagen.jpg', 'no es una URL', 'https://example.com/imagen con espacios.jpg', 'https://usuario:clave@example.com/imagen.jpg']) {
    assert.ok(validarPelicula({ ...pelicula, portada_url }, generos).portada_url)
  }
})

test('admite una URL de imagen http o https sin exigir WebP', () => {
  for (const portada_url of ['https://example.com/portada.jpg', 'https://bucket.s3.us-east-1.amazonaws.com/portadas/interestelar.webp']) {
    assert.deepEqual(validarPelicula({ ...pelicula, portada_url }, generos), {})
  }
})

