import { Pencil, Trash2 } from 'lucide-react'

/**
 * Canonical icon buttons — use these everywhere instead of defining locally.
 * Size: 30×30, icon: 14px. Hover: border-bg + primary text for pencil,
 * danger-hover for trash.
 */

export function PencilBtn({ onClick, title = 'Edit' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center rounded-md transition-colors duration-150"
      style={{ width: 30, height: 30, backgroundColor: 'transparent', color: 'var(--text-secondary)' }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
    >
      <Pencil size={14} />
    </button>
  )
}

export function TrashBtn({ onClick, title = 'Delete' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center rounded-md transition-colors duration-150"
      style={{ width: 30, height: 30, backgroundColor: 'var(--danger)', color: '#fff' }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--danger-hover)'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--danger)'}
    >
      <Trash2 size={14} />
    </button>
  )
}
