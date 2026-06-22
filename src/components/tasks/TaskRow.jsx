import { StatusPill, PriorityBadge, EnergyBadge, DurationDisplay, ContextTag, ProgressBar, DragHandle } from '../ui'
import { computeProgress } from '../../lib/progress'

export default function TaskRow({ task, onClick, selectable = false, selected = false, onToggle, reorderable = false, onDragStart, onDragEnd }) {
  const isDone          = task.status === 'done'
  const isWaiting       = task.status === 'waiting'
  const today           = new Date().toLocaleDateString('en-CA')
  const overdue         = task.due_date && task.due_date < today && !isDone
  const deadlineUrgent  = task.deadline && task.deadline <= today && !isDone

  return (
    <div
      onClick={selectable ? onToggle : onClick}
      className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer transition-colors hover:opacity-90"
      style={{ borderColor: 'var(--border)', backgroundColor: selected ? 'var(--state-info-bg)' : 'transparent' }}
    >
      {reorderable && <DragHandle onDragStart={onDragStart} onDragEnd={onDragEnd} className="-ml-1" />}

      {/* Checkbox (select mode) or status dot */}
      {selectable ? (
        <div
          className="flex items-center justify-center rounded border shrink-0"
          style={{ width: 16, height: 16, borderColor: selected ? 'var(--accent)' : 'var(--border)', backgroundColor: selected ? 'var(--accent)' : 'transparent' }}
        >
          {selected && <span style={{ color: 'var(--pane-bg)', fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✓</span>}
        </div>
      ) : (
        <StatusPill status={task.status} type="task" />
      )}

      {/* Title + project */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm truncate"
          style={{
            color: isDone ? 'var(--text-secondary)' : 'var(--text-primary)',
            textDecoration: isDone ? 'line-through' : 'none',
          }}
        >
          {task.is_highlight && <span className="mr-1">⭐</span>}
          {task.title}
        </p>
        {task.projects?.title && (
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            📁 {task.projects.title}
          </p>
        )}
        {!task.projects?.title && task.area && (
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            📂 {task.area}
          </p>
        )}
        {task.subtasks?.length > 0 && (
          <ProgressBar fraction={computeProgress(task.subtasks).fraction} className="mt-1.5 max-w-[160px]" />
        )}
        {task.context?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {task.context.map(tag => (
              <ContextTag key={tag} tag={`@${tag}`} />
            ))}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 shrink-0">
        {task.deadline && !isDone && (
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: deadlineUrgent ? 'var(--state-error-bg)' : 'transparent',
              color: deadlineUrgent ? 'var(--accent-red)' : 'var(--accent-red)',
              border: `1px solid var(--accent-red)`,
              opacity: deadlineUrgent ? 1 : 0.7,
            }}
            title="Deadline"
          >
            🔴 {new Date(task.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {task.due_date && (
          <span className="text-xs" style={{ color: overdue ? 'var(--danger)' : 'var(--text-secondary)' }}>
            {overdue ? '⚠ ' : ''}
            {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {task.duration && <DurationDisplay duration={task.duration} />}
        {task.energy_level && <EnergyBadge energyLevel={task.energy_level} />}
        <PriorityBadge priority={task.priority} />
      </div>
    </div>
  )
}
