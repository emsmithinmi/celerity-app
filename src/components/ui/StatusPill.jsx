import { TASK_STATUSES, PROJECT_STATUSES, PEOPLE_STATUSES } from '../../lib/constants'
import LucideIcon from './LucideIcon'

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
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}
      style={{
        backgroundColor: def.bg,
        color: def.text,
        borderColor: def.border ?? def.bg,
      }}
    >
      <LucideIcon name={def.icon} size={11} />
      {def.label}
    </span>
  )
}
