import { TASK_STATUSES, PROJECT_STATUSES, PEOPLE_STATUSES } from '../../lib/constants'

const STATUS_MAPS = {
  task:    TASK_STATUSES,
  project: PROJECT_STATUSES,
  person:  PEOPLE_STATUSES,
}

export default function StatusPill({ status, type = 'task', className = '' }) {
  const map = STATUS_MAPS[type] ?? TASK_STATUSES
  const def = map[status]

  if (!def) return null

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}
      style={{
        backgroundColor: def.bg,
        color: def.text,
        borderColor: def.border ?? def.bg,
      }}
    >
      {def.label}
    </span>
  )
}
