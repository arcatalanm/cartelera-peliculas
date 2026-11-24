import Icon from './Icon'

export default function PeliculaCard({ pelicula, guardada, onGuardar, onDetalle }) {
  return (
    <article className="movie-card">
      <div className="poster-wrap">
        <button className="poster-button" onClick={() => onDetalle(pelicula)} aria-label={`Ver detalles de ${pelicula.titulo}`}>
          <img className="poster-image" src={pelicula.portada_url || `${import.meta.env.BASE_URL}cartelera.svg`} alt={`Portada de ${pelicula.titulo}`} loading="lazy" width="600" height="900" />
          <span className="poster-shade" />
          <span className="poster-cta">Descubrir película <Icon name="plus" size={18} /></span>
        </button>
        <span className="poster-classification">{pelicula.clasificacion}</span>
        <button className={`save-button ${guardada ? 'is-saved' : ''}`} onClick={() => onGuardar(pelicula.id)} aria-label={`${guardada ? 'Quitar' : 'Guardar'} ${pelicula.titulo}${guardada ? ' de' : ' en'} mi lista`} aria-pressed={guardada}>
          <Icon name={guardada ? 'check' : 'plus'} size={19} />
        </button>
      </div>
      <div className="movie-meta"><span>{pelicula.genero}</span><span>{pelicula.anio}</span></div>
      <h3><button onClick={() => onDetalle(pelicula)}>{pelicula.titulo}</button></h3>
      <p className="movie-director">{pelicula.director || 'Dirección sin especificar'} {pelicula.duracion && <span>· {pelicula.duracion} min</span>}</p>
    </article>
  )
}
