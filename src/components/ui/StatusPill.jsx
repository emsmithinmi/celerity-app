import { TASK_STATUSES, PROJECT_STATUSES } from '../../lib/constants'

export default function StatusPill({ status, type = 'task' }) {
  const map = type === 'project' ? PROJECT_STATUSES : TASK_STATUSES
  const def = map[status]
  if (!def) return null

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{
        backgroundColor: def.bg,
        color: def.text,
        borderColor: def.border ?? 'transparent',
      }}
    >
      {type === 'task' && def.icon && <span aria-hidden="true">{def.icon}</span>}
      {def.label}
    </span>
  )
}
