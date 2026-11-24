import axios from 'axios'

const config = import.meta.env ?? {}
const base = (config.VITE_API_URL || '/api').replace(/\/$/, '')

export const apiClient = axios.create({
  baseURL: base,
  timeout: 20000,
  headers: { Accept: 'application/json' },
})

const campos = {
  titulo: 'Título', director: 'Dirección', anio_estreno: 'Año de estreno',
  duracion: 'Duración', clasificacion: 'Clasificación', sinopsis: 'Sinopsis',
  descripcion_completa: 'Descripción completa', portada_url: 'URL de la portada',
  id_genero: 'Género', en_cartelera: 'Mostrar en cartelera',
}

function mensajeValidacion(error) {
  const limite = error.ctx ?? {}
  const mensajes = {
    string_too_long: `Admite hasta ${limite.max_length} caracteres.`,
    string_too_short: 'Completa este campo.',
    int_type: 'Usa un número entero.', int_parsing: 'Usa un número entero.',
    greater_than_equal: `El valor mínimo es ${limite.ge}.`,
    greater_than: `El valor debe ser mayor que ${limite.gt}.`,
    less_than_equal: `El valor máximo es ${limite.le}.`,
    literal_error: 'Selecciona una opción válida.',
    missing: 'Completa este campo.', extra_forbidden: 'Este campo no está admitido.',
    url_parsing: 'Usa una URL http o https válida.',
    url_scheme: 'Usa una URL http o https válida.',
    bool_type: 'Selecciona una opción válida.',
  }
  return mensajes[error.type] || (error.type === 'value_error'
    ? (error.msg || 'Revisa este campo.').replace(/^Value error, /, '')
    : 'Revisa el valor de este campo.')
}

function errorRespuesta(status, body, method) {
  const error = new Error()
  error.status = status
  if (Array.isArray(body?.detail)) {
    error.fieldErrors = {}
    error.message = body.detail.map((detalle) => {
      const campo = detalle.loc?.find((parte) => Object.hasOwn(campos, parte))
      const mensaje = mensajeValidacion(detalle)
      if (campo) error.fieldErrors[campo] = mensaje
      return `${campos[campo] || 'Datos de la película'}: ${mensaje}`
    }).join(' ')
  } else if (typeof body?.detail === 'string') {
    error.message = body.detail
  } else if ([502, 503, 504].includes(status)) {
    error.message = 'El backend no está disponible. Inténtalo de nuevo más tarde.'
  } else if (status === 413) {
    error.message = 'Los datos superan el tamaño admitido por el servidor. Reduce el texto e inténtalo otra vez.'
  } else if (status === 404 || status === 405) {
    error.message = 'No se encontró el servicio de películas. Revisa la dirección del backend.'
  } else {
    error.message = `${method === 'POST' ? 'No se pudo guardar la película' : 'No se pudieron cargar los datos'} (HTTP ${status}). Inténtalo otra vez.`
  }
  return error
}

function errorNormalizado(error, method) {
  let normalizado
  if (error?.response) {
    normalizado = errorRespuesta(error.response.status, error.response.data, method)
  } else if (['ECONNABORTED', 'ETIMEDOUT'].includes(error?.code)) {
    normalizado = new Error('El servidor tardó demasiado en responder. Comprueba la conexión antes de volver a intentarlo.', { cause: error })
  } else {
    normalizado = new Error('No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.', { cause: error })
  }
  normalizado.isNormalized = true
  return normalizado
}

function respuestaInvalida() {
  const error = new Error('El servidor devolvió una respuesta no válida. Revisa la dirección del backend.')
  error.isNormalized = true
  return error
}

async function request(path, options = {}) {
  let body
  try {
    const respuesta = await apiClient.request({ url: path, ...options })
    body = respuesta.data
  } catch (error) {
    throw errorNormalizado(error, options.method)
  }
  if (body === null || body === undefined || typeof body !== 'object') throw respuestaInvalida()
  return body
}

export const listarPeliculas = () => request('/peliculas?incluir_inactivas=true')
export const listarGeneros = () => request('/generos')
export const crearPelicula = (pelicula) => request('/peliculas', {
  method: 'POST',
  data: pelicula,
})

export function adaptarPelicula(pelicula) {
  return {
    ...pelicula,
    id: `pelicula-${pelicula.id_pelicula}`,
    anio: pelicula.anio_estreno,
    original: pelicula.titulo,
  }
}
