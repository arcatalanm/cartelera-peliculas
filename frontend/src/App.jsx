import { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import PeliculaCard from './components/PeliculaCard'
import Icon from './components/Icon'
import Modal from './components/Modal'
import AgregarPelicula from './components/AgregarPelicula'
import { duracionLegible } from './services/formato'
import { adaptarPelicula, listarPeliculas } from './services/api'
import top from './assets/top.png'
import title from './assets/tittle.png'

function leerPreferencia(clave, fallback) {
  try { return JSON.parse(localStorage.getItem(clave)) ?? fallback } catch { return fallback }
}

const normalizar = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function App() {
  const [tema, setTema] = useState(() => leerPreferencia('cartelera-tema', 'dark') === 'light' ? 'light' : 'dark')
  const [catalogo, setCatalogo] = useState([])
  const [errorCatalogo, setErrorCatalogo] = useState('')
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true)
  const [guardadas, setGuardadas] = useState(() => {
    const valor = leerPreferencia('cartelera-lista', [])
    return Array.isArray(valor) ? valor.filter((id) => typeof id === 'string') : []
  })
  const [vista, setVista] = useState('cartelera')
  const [busqueda, setBusqueda] = useState('')
  const [genero, setGenero] = useState('Todas')
  const [orden, setOrden] = useState('seleccion')
  const [detalle, setDetalle] = useState(null)
  const [agregar, setAgregar] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    let activo = true
    listarPeliculas().then((datos) => {
      if (!activo) return
      const nuevas = datos.map(adaptarPelicula)
      setCatalogo(nuevas)
      setErrorCatalogo('')
    }).catch((error) => { if (activo) setErrorCatalogo(error.message) })
      .finally(() => { if (activo) setCargandoCatalogo(false) })
    return () => { activo = false }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = tema
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'dark' ? '#101010' : '#f5f5f3')
    try { localStorage.setItem('cartelera-tema', JSON.stringify(tema)) } catch { /* El tema funciona también sin almacenamiento. */ }
  }, [tema])
  useEffect(() => {
    try { localStorage.setItem('cartelera-lista', JSON.stringify(guardadas)) } catch { /* La lista permanece en esta sesión. */ }
  }, [guardadas])
  useEffect(() => {
    if (!aviso) return
    const timer = setTimeout(() => setAviso(''), 2600)
    return () => clearTimeout(timer)
  }, [aviso])

  const guardar = (id) => {
    const existe = guardadas.includes(id)
    setGuardadas((anteriores) => existe ? anteriores.filter((item) => item !== id) : [...anteriores, id])
    setAviso(existe ? 'Película quitada de tu lista.' : 'Película guardada en tu lista.')
  }
  const reiniciarFiltros = () => { setBusqueda(''); setGenero('Todas'); setOrden('seleccion') }
  const cambiarVista = (nuevaVista) => { setVista(nuevaVista); reiniciarFiltros() }
  const generos = ['Todas', ...new Set(catalogo.filter((p) => p.en_cartelera !== false).map((p) => p.genero))]
  const filtradas = catalogo.filter((pelicula) =>
    pelicula.en_cartelera !== false &&
    (vista !== 'guardadas' || guardadas.includes(pelicula.id)) &&
    (genero === 'Todas' || pelicula.genero === genero) &&
    normalizar(`${pelicula.titulo} ${pelicula.original} ${pelicula.director}`).includes(normalizar(busqueda.trim())),
  ).sort((a, b) => orden === 'recientes' ? b.anio - a.anio : orden === 'clasicos' ? a.anio - b.anio : orden === 'titulo' ? a.titulo.localeCompare(b.titulo, 'es') : 0)
  const peliculaCreada = (pelicula) => {
    setCatalogo((prev) => [adaptarPelicula(pelicula), ...prev])
    setErrorCatalogo('')
    setAgregar(false)
    cambiarVista('cartelera')
    setAviso(pelicula.en_cartelera ? 'Película añadida a la cartelera.' : 'Película guardada fuera de cartelera.')
  }

  return (
    <>
      <a className="skip-link" href="#cartelera">Saltar a las películas</a>
      <div id="inicio" />
      <Navbar tema={tema} cambiarTema={() => setTema(tema === 'dark' ? 'light' : 'dark')} vista={vista} setVista={cambiarVista} guardadas={guardadas.length} abrirAgregar={() => setAgregar(true)} />
      <main>
        <section className="hero shell" aria-labelledby="hero-title">
          <h1 id="hero-title" className="visually-hidden">Pel?culas cl?sicas para toda la familia</h1>
          <img className="hero-image" src={top} alt="Collage de Rocky, Toy Story y Terminator con el mensaje: Pel?culas cl?sicas para toda la familia." width="1672" height="941" fetchPriority="high" />
        </section>

        <section className="catalog shell" id="cartelera" aria-labelledby="catalog-title">
          <div className="catalog-heading">
            <div><span className="eyebrow">TU PRÓXIMA HISTORIA EMPIEZA AQUÍ</span><h2 id="catalog-title">{vista === 'guardadas' ? 'Mi lista' : 'La cartelera'}<span className="heading-period">.</span></h2></div>
            <p>{vista === 'guardadas' ? 'Esas películas que dejaste para después.' : 'Un poco de nostalgia. Mucho buen cine.'}</p>
          </div>
          <div className="catalog-toolbar">
            <div className="genre-list" role="group" aria-label="Filtrar por género">{generos.map((item) => <button key={item} className={`genre-button ${genero === item ? 'selected' : ''}`} aria-pressed={genero === item} onClick={() => setGenero(item)}>{item}</button>)}</div>
            <label className="search-field"><Icon name="search" size={18} /><input type="search" placeholder="Buscar una película..." value={busqueda} onChange={(event) => setBusqueda(event.target.value)} aria-label="Buscar por película o director" /></label>
          </div>
          {errorCatalogo && <p className="catalog-notice" role="status">Mostrando la selección inicial. {errorCatalogo}</p>}
          <div className="results-bar"><p role="status">{filtradas.length} {filtradas.length === 1 ? 'película' : 'películas'}{genero !== 'Todas' ? ` · ${genero}` : ' para descubrir'}</p><label className="sort-label">Ordenar por <select value={orden} onChange={(event) => setOrden(event.target.value)}><option value="seleccion">Nuestra selección</option><option value="recientes">Más recientes</option><option value="clasicos">Más antiguas</option><option value="titulo">Título A–Z</option></select></label></div>
          {cargandoCatalogo ? <p role="status">Cargando cartelera...</p> : errorCatalogo ? null : filtradas.length > 0 ? <div className="movie-grid">{filtradas.map((pelicula) => <PeliculaCard key={pelicula.id} pelicula={pelicula} guardada={guardadas.includes(pelicula.id)} onGuardar={guardar} onDetalle={setDetalle} />)}</div> : <div className="empty-state"><Icon name={vista === 'guardadas' && !guardadas.length ? 'bookmark' : 'search'} size={32} /><h3>{vista === 'guardadas' && !guardadas.length ? 'Tu próxima película te espera.' : 'Esta búsqueda no tiene resultados.'}</h3><p>{vista === 'guardadas' && !guardadas.length ? 'Usa el botón + de una portada para guardarla aquí.' : 'Prueba con otro título, director o género.'}</p><button className="button button-outline" onClick={() => { reiniciarFiltros(); if (!guardadas.length) setVista('cartelera') }}>{vista === 'guardadas' && !guardadas.length ? 'Explorar cartelera' : 'Limpiar filtros'}</button></div>}
        </section>

      </main>
      <footer className="footer shell"><a className="footer-brand" href="#inicio"><img src={`${import.meta.env.BASE_URL}logo.jpg`} className="brand-logo" alt="" /><img src={title} className="wordmark" alt="CineGO" /></a><p>Hecho para volver a sentir el cine.</p><button className="footer-link" onClick={() => setAgregar(true)}>+ Añadir película</button><span className="footer-year">© {new Date().getFullYear()}</span></footer>

      {detalle && <Modal label={detalle.titulo} onClose={() => setDetalle(null)} className="movie-modal" actions={<button className={`icon-button modal-save ${guardadas.includes(detalle.id) ? 'is-saved' : ''}`} onClick={() => guardar(detalle.id)} aria-pressed={guardadas.includes(detalle.id)} aria-label={guardadas.includes(detalle.id) ? 'Quitar de mi lista' : 'Agregar a mi lista'} title={guardadas.includes(detalle.id) ? 'Quitar de mi lista' : 'Agregar a mi lista'}><Icon name={guardadas.includes(detalle.id) ? 'check' : 'plus'} /></button>}><img className="detail-poster" src={detalle.portada_url || `${import.meta.env.BASE_URL}cartelera.svg`} alt={`Portada de ${detalle.titulo}`} /><div className="detail-content"><span className="eyebrow">{detalle.genero}{detalle.anio ? ` · ${detalle.anio}` : ''}</span><h2>{detalle.titulo}</h2>{detalle.original !== detalle.titulo && <p className="original-title">{detalle.original}</p>}<div className="detail-facts">{detalle.duracion && <span><Icon name="clock" size={17} />{duracionLegible(detalle.duracion)}</span>}<span className="classification">{detalle.clasificacion}</span></div><p className="detail-synopsis">{detalle.sinopsis || 'Esta película todavía no tiene sinopsis.'}</p>{detalle.descripcion_completa && <div className="detail-description"><h3>La historia</h3><p>{detalle.descripcion_completa}</p></div>}<p className="director-label">DIRECCIÓN<span>{detalle.director || 'Sin especificar'}</span></p></div></Modal>}
      {agregar && <AgregarPelicula onClose={() => setAgregar(false)} onCreated={peliculaCreada} peliculas={catalogo} />}
      <div className={`toast ${aviso ? 'visible' : ''}`} role="status" aria-live="polite">{aviso && <><Icon name="check" size={18} />{aviso}</>}</div>
    </>
  )
}
