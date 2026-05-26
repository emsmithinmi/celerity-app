import { usePriorities } from '../../contexts/PrioritiesContext'

export default function PriorityBadge({ priority, className = '' }) {
  const { priorityMap } = usePriorities()
  const def = priorityMap[priority]
  if (!def) return null

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide uppercase ${className}`}
      style={{ backgroundColor: def.bg_color, color: def.text_color }}
    >
      {def.label}
    </span>
  )
}
