export const CLASIFICACIONES = ['TE', 'TE+7', '+14', '+16', '+18']
export const ANIO_MAXIMO = new Date().getFullYear() + 5
export function validarPelicula(valores, generos) {
  const errores = {}
  if (!valores.titulo.trim()) errores.titulo = 'Escribe el título de la película.'
  else if (valores.titulo.trim().length > 200) errores.titulo = 'El título admite hasta 200 caracteres.'
  if (valores.director.trim().length > 150) errores.director = 'El director admite hasta 150 caracteres.'
  if (!generos.some((genero) => genero.id_genero === Number(valores.id_genero))) errores.id_genero = 'Selecciona un género.'
  for (const [campo, minimo, maximo, etiqueta] of [
    ['anio_estreno', 1888, ANIO_MAXIMO, 'El año'], ['duracion', 1, 1440, 'La duración'],
  ]) {
    if (valores[campo] !== '' && (!Number.isInteger(Number(valores[campo])) || Number(valores[campo]) < minimo || Number(valores[campo]) > maximo)) {
      errores[campo] = `${etiqueta} debe ser un número entero entre ${minimo} y ${maximo}.`
    }
  }
  if (!CLASIFICACIONES.includes(valores.clasificacion)) errores.clasificacion = 'Selecciona una clasificación válida.'
  if (valores.sinopsis.trim().length > 300) errores.sinopsis = 'La sinopsis admite hasta 300 caracteres.'
  if (valores.descripcion_completa.trim().length > 20000) errores.descripcion_completa = 'La descripción admite hasta 20.000 caracteres.'
  else if (new TextEncoder().encode(valores.descripcion_completa.trim()).length > 65535) errores.descripcion_completa = 'La descripción supera el tamaño admitido. Reduce el texto o los caracteres especiales.'
  if (!valores.portada_url.trim()) {
    errores.portada_url = 'Escribe la URL de la portada.'
  } else {
    try {
      const url = new URL(valores.portada_url.trim())
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || /\s/.test(valores.portada_url.trim()) || valores.portada_url.trim().length > 500) throw new Error()
    } catch { errores.portada_url = 'Usa una URL http o https válida, de hasta 500 caracteres.' }
  }
  return errores
}
