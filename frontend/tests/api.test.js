import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { apiClient, crearPelicula, listarGeneros } from '../src/services/api.js'

const originalAdapter = apiClient.defaults.adapter
afterEach(() => { apiClient.defaults.adapter = originalAdapter })

function responder(data, status = 200) {
  return async (config) => ({ data, status, statusText: String(status), headers: {}, config, request: {} })
}

function fallar(status, data) {
  return async (config) => {
    const error = new Error('Request failed')
    error.config = config
    error.response = { data, status, statusText: String(status), headers: {}, config, request: {} }
    throw error
  }
}

test('el 502 del proxy indica que falta el backend', async () => {
  apiClient.defaults.adapter = fallar(502, 'Bad Gateway')
  await assert.rejects(listarGeneros(), /El backend no está disponible/)
})

test('los errores 422 se asocian al campo sin revelar el payload', async () => {
  apiClient.defaults.adapter = fallar(422, { detail: [
    { loc: ['body', 'sinopsis'], type: 'string_too_long', ctx: { max_length: 300 }, input: 'CONTENIDO_PRIVADO' },
  ] })
  await assert.rejects(crearPelicula({}), (error) => {
    assert.equal(error.fieldErrors.sinopsis, 'Admite hasta 300 caracteres.')
    assert.match(error.message, /Sinopsis/)
    assert.doesNotMatch(error.message, /CONTENIDO_PRIVADO/)
    return true
  })
})

test('conserva el motivo devuelto por el backend', async () => {
  apiClient.defaults.adapter = fallar(409, { detail: 'Ya existe una película con ese título y año.' })
  await assert.rejects(crearPelicula({}), /Ya existe una película/)
})

test('detecta una URL que devuelve HTML en lugar de JSON', async () => {
  apiClient.defaults.adapter = responder('<html>frontend</html>')
  await assert.rejects(listarGeneros(), /respuesta no válida/)
})

test('distingue un fallo de red de un tiempo de espera agotado', async () => {
  apiClient.defaults.adapter = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(listarGeneros(), /No se pudo conectar/)
  apiClient.defaults.adapter = async () => { const error = new Error('Timeout'); error.code = 'ECONNABORTED'; throw error }
  await assert.rejects(listarGeneros(), /tardó demasiado/)
})

test('devuelve los datos cuando la respuesta es correcta', async () => {
  const genres = [{ id_genero: 1, nombre: 'Acción' }]
  apiClient.defaults.adapter = responder(genres)
  assert.deepEqual(await listarGeneros(), genres)
})

