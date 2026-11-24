import { useEffect, useRef } from 'react'
import Icon from './Icon'

export default function Modal({ children, onClose, label, className = '', actions, busy = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
    }
  }, [])
  return (
    <dialog ref={ref} className={`modal ${className}`} aria-label={label} onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }} onClick={(event) => {
      if (event.target === event.currentTarget) {
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
      }
    }}>
      <div className="modal-actions">{actions}<button className="icon-button modal-close" onClick={onClose} aria-label="Cerrar ventana" title="Cerrar" disabled={busy}><Icon name="close" /></button></div>
      {children}
    </dialog>
  )
}
