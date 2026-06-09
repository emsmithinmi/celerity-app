import { Pencil, Trash2 } from 'lucide-react'

/**
 * Canonical icon buttons — use these everywhere instead of defining locally.
 * Size: 28×28 (standard across the app), icon: 13px.
 *
 * PencilBtn: transparent → border bg on hover
 * TrashBtn:  transparent → delete-hover-bg + error text on hover
 */

export function PencilBtn({ onClick, title = 'Edit' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center rounded transition-colors duration-150"
      style={{ width: 28, height: 28, backgroundColor: 'transparent', color: 'var(--text-secondary)' }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
    >
      <Pencil size={13} />
    </button>
  )
}

export function TrashBtn({ onClick, title = 'Delete' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center rounded transition-colors duration-150"
      style={{ width: 28, height: 28, backgroundColor: 'transparent', color: 'var(--text-secondary)' }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--delete-hover-bg)'; e.currentTarget.style.color = 'var(--state-error-text)' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
    >
      <Trash2 size={13} />
    </button>
  )
}
