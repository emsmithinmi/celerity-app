import { PRIORITIES } from '../../lib/constants'

export default function PriorityBadge({ priority }) {
  const def = PRIORITIES[priority]
  if (!def) return null

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide"
      style={{
        backgroundColor: def.bg,
        color: def.text,
      }}
    >
      {def.label}
    </span>
  )
}
