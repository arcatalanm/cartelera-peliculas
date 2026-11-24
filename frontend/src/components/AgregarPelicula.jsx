import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import Icon from './Icon'
import title from '../assets/tittle.png'
import { crearPelicula, listarGeneros } from '../services/api'
import {
  ANIO_MAXIMO, CLASIFICACIONES, validarPelicula,
} from '../services/validacionPelicula'

const inicial = { titulo: '', director: '', anio_estreno: '', duracion: '', clasificacion: 'TE', sinopsis: '', descripcion_completa: '', en_cartelera: true, portada_url: '', id_genero: '' }

export default function AgregarPelicula({ onClose, onCreated, peliculas }) {
  const [valores, setValores] = useState(inicial)
  const [generos, setGeneros] = useState([])
  const [errores, setErrores] = useState({})
  const [errorServidor, setErrorServidor] = useState('')
  const [cargandoGeneros, setCargandoGeneros] = useState(true)
  const [errorGeneros, setErrorGeneros] = useState('')
  const [intento, setIntento] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const formRef = useRef(null)

  useEffect(() => {
    let activo = true
    listarGeneros().then((datos) => {
      if (activo) { setGeneros(datos); setErrorGeneros(''); setCargandoGeneros(false) }
    }).catch((error) => {
      if (activo) { setErrorGeneros(error.message); setCargandoGeneros(false) }
    })
    return () => { activo = false }
  }, [intento])

  const cambiar = (event) => {
    const { name, value, checked, type } = event.target
    setValores((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setErrores((prev) => ({ ...prev, [name]: undefined }))
    setErrorServidor('')
  }
  const enviar = async (event) => {
    event.preventDefault()
    if (guardando || cargandoGeneros || errorGeneros) return
    const nuevosErrores = validarPelicula(valores, generos)
    if (peliculas.some((pelicula) => pelicula.titulo.toLocaleLowerCase('es').trim() === valores.titulo.toLocaleLowerCase('es').trim() && (pelicula.anio ?? null) === (valores.anio_estreno === '' ? null : Number(valores.anio_estreno)))) nuevosErrores.titulo = 'Ya existe una película con ese título y año.'
    setErrores(nuevosErrores)
    if (Object.keys(nuevosErrores).length) {
      const primerCampo = Object.keys(nuevosErrores)[0]
      const elemento = formRef.current.elements.namedItem(primerCampo)
      elemento?.focus()
      return
    }
    setGuardando(true); setErrorServidor('')
    try {
      const pelicula = await crearPelicula({
        titulo: valores.titulo.trim(), director: valores.director.trim() || null,
        anio_estreno: valores.anio_estreno === '' ? null : Number(valores.anio_estreno),
        duracion: valores.duracion === '' ? null : Number(valores.duracion),
        clasificacion: valores.clasificacion, id_genero: Number(valores.id_genero),
        sinopsis: valores.sinopsis.trim() || null, descripcion_completa: valores.descripcion_completa.trim() || null,
        en_cartelera: valores.en_cartelera, portada_url: valores.portada_url.trim(),
      })
      onCreated(pelicula)
    } catch (error) {
      setErrorServidor(error.message)
      if (error.fieldErrors) {
        const erroresServidor = { ...error.fieldErrors }
        setErrores(erroresServidor)
        const primerCampo = Object.keys(erroresServidor)[0]
        requestAnimationFrame(() => (formRef.current?.elements.namedItem(primerCampo))?.focus())
      }
      setGuardando(false)
    }
  }
  const atributos = (name) => ({ name, id: `crear-${name}`, value: valores[name], onChange: cambiar, 'aria-invalid': Boolean(errores[name]), 'aria-describedby': errores[name] ? `error-${name}` : undefined })
  const errorCampo = (name) => errores[name] && <span className="field-error" id={`error-${name}`}>{errores[name]}</span>
  const textoBoton = guardando ? 'Guardando película...' : 'Añadir película'

  return (
    <Modal label="Añadir película" className="add-modal" onClose={() => { if (!guardando) onClose() }} busy={guardando}>
      <div className="add-heading"><img src={title} className="wordmark" alt="CineGO" /><span className="eyebrow">AMPLÍA LA CARTELERA</span><h2>Una historia más<span>.</span></h2><p>Añade una película a CineGO. Los campos con * son obligatorios.</p></div>
      <form ref={formRef} onSubmit={enviar} noValidate>
        <fieldset disabled={guardando} className="movie-form-fields">
          <div className="form-grid">
            <label className="form-field form-wide" htmlFor="crear-titulo">Título *<input {...atributos('titulo')} maxLength={200} placeholder="El nombre de una gran historia" autoComplete="off" required />{errorCampo('titulo')}</label>
            <label className="form-field" htmlFor="crear-director">Dirección<input {...atributos('director')} maxLength={150} placeholder="Nombre del director o directora" />{errorCampo('director')}</label>
            <label className="form-field" htmlFor="crear-id_genero">Género *<select {...atributos('id_genero')} required disabled={cargandoGeneros || Boolean(errorGeneros)}><option value="">{cargandoGeneros ? 'Cargando géneros...' : 'Selecciona un género'}</option>{generos.map((g) => <option key={g.id_genero} value={g.id_genero}>{g.nombre}</option>)}</select>{errorCampo('id_genero')}</label>
            {errorGeneros && <div className="form-alert form-wide" role="alert"><p>{errorGeneros}</p><button type="button" onClick={() => { setCargandoGeneros(true); setIntento((prev) => prev + 1) }}>Reintentar cargar géneros</button></div>}
            <label className="form-field" htmlFor="crear-anio_estreno">Año de estreno<input {...atributos('anio_estreno')} type="number" min="1888" max={ANIO_MAXIMO} step="1" placeholder="Ej. 2024" />{errorCampo('anio_estreno')}</label>
            <label className="form-field" htmlFor="crear-duracion">Duración en minutos<input {...atributos('duracion')} type="number" min="1" max="1440" step="1" placeholder="Ej. 120" />{errorCampo('duracion')}</label>
            <label className="form-field" htmlFor="crear-clasificacion">Clasificación<select {...atributos('clasificacion')}>{CLASIFICACIONES.map((c) => <option key={c} value={c}>{c === 'TE' ? 'TE · Todo espectador' : c === 'TE+7' ? 'TE+7 · Mayores de 7 años' : `${c} · Mayores de ${c.slice(1)} años`}</option>)}</select>{errorCampo('clasificacion')}</label>
            <label className="form-field form-wide" htmlFor="crear-sinopsis"><span>Sinopsis <span className="field-counter">{valores.sinopsis.length}/300</span></span><textarea {...atributos('sinopsis')} rows="3" maxLength={300} placeholder="Un vistazo a la historia, sin spoilers." />{errorCampo('sinopsis')}</label>
            <label className="form-field form-wide" htmlFor="crear-descripcion_completa"><span>Descripción completa <span className="field-counter">{valores.descripcion_completa.length}/20.000</span></span><textarea {...atributos('descripcion_completa')} rows="4" maxLength={20000} placeholder="Cuenta un poco más sobre la película." />{errorCampo('descripcion_completa')}</label>
          </div>
          <label className="form-field form-wide cover-field" htmlFor="crear-portada_url">URL de la portada *<input {...atributos('portada_url')} type="url" maxLength={500} placeholder="https://ejemplo.com/portada.jpg" required /><span className="field-hint">Pega el enlace directo a una imagen pública.</span>{errorCampo('portada_url')}</label>
          <label className="visibility-field"><input type="checkbox" name="en_cartelera" checked={valores.en_cartelera} onChange={cambiar} /><span><strong>Mostrar en cartelera</strong><small>Desactívalo para guardar la película sin publicarla en el catálogo.</small></span></label>
        </fieldset>
        {errorServidor && <div className="form-alert" role="alert">{errorServidor}</div>}
        <div className="form-actions"><button type="button" className="button button-outline" disabled={guardando} onClick={onClose}>Cancelar</button><button type="submit" className="button button-solid" disabled={guardando || cargandoGeneros || Boolean(errorGeneros)}><Icon name={guardando ? 'clock' : 'plus'} size={18} />{textoBoton}</button></div>
      </form>
    </Modal>
  )
}
