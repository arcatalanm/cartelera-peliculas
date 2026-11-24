import Icon from './Icon'
import title from '../assets/tittle.png'

export default function Navbar({ tema, cambiarTema, vista, setVista, guardadas, abrirAgregar }) {
  return (
    <header className="header shell">
      <a className="brand" href="#inicio" aria-label="CineGO, inicio" onClick={() => setVista('cartelera')}>
        <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="" className="brand-logo" />
        <img src={title} className="wordmark" alt="CineGO" />
      </a>
      <nav className="navigation" aria-label="Navegación principal">
        <a href="#cartelera" className={vista === 'cartelera' ? 'nav-link active' : 'nav-link'} onClick={() => setVista('cartelera')}>Cartelera</a>
        <a href="#cartelera" className={vista === 'guardadas' ? 'nav-link active' : 'nav-link'} onClick={() => setVista('guardadas')}>Mi lista <span className="nav-count">{guardadas}</span></a>
        <button className="nav-link add-link" onClick={abrirAgregar}><Icon name="plus" size={16} /> Añadir</button>
        <span className="nav-divider" />
        <button className="icon-button theme-toggle" onClick={cambiarTema} aria-label={`Activar tema ${tema === 'dark' ? 'claro' : 'oscuro'}`} title={`Tema ${tema === 'dark' ? 'claro' : 'oscuro'}`}>
          <Icon name={tema === 'dark' ? 'sun' : 'moon'} />
        </button>
      </nav>
    </header>
  )
}
