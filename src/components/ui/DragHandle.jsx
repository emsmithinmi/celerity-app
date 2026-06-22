import { GripVertical } from 'lucide-react'

/**
 * Drag affordance for reorderable list rows. The handle itself is the drag
 * source (so clicking the rest of the row still navigates / selects text);
 * the row wrapper is the drop target.
 */
export default function DragHandle({ onDragStart, onDragEnd, size = 16, className = '' }) {
  return (
    <span
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        // Firefox needs data set for a drag to start
        try { e.dataTransfer.setData('text/plain', '') } catch { /* ignore */ }
        onDragStart?.()
      }}
      onDragEnd={() => onDragEnd?.()}
      onClick={(e) => e.stopPropagation()}
      title="Drag to reorder"
      className={`flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing transition-colors ${className}`}
      style={{ color: 'var(--text-dim)' }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)' }}
    >
      <GripVertical size={size} />
    </span>
  )
}
