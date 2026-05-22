import { StatusPill, PriorityBadge, ContextTag } from '../ui'
import { Calendar, FolderKanban } from 'lucide-react'

export default function TaskCard({ task, onClick }) {
  const dueDate = task.due_date
    ? new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null

  const isOverdue =
    task.due_date &&
    new Date(task.due_date + 'T00:00:00') < new Date() &&
    task.status !== 'done'

  return (
    <div
      onClick={onClick}
      className="group bg-app-pane border border-app-border rounded-xl p-4 cursor-pointer hover:border-app-highlight transition-colors"
    >
      {/* Badges */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <StatusPill status={task.status} type="task" />
        {task.priority && task.priority !== 'routine' && (
          <PriorityBadge priority={task.priority} />
        )}
      </div>

      {/* Title */}
      <h3
        className={`text-sm font-medium leading-snug mb-2.5 ${
          task.status === 'done' ? 'line-through text-app-muted' : 'text-app-text'
        }`}
      >
        {task.title}
      </h3>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-xs text-app-muted flex-wrap">
        {task.projects && (
          <span className="flex items-center gap-1">
            <FolderKanban size={11} />
            {task.projects.title}
          </span>
        )}
        {dueDate && (
          <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : ''}`}>
            <Calendar size={11} />
            {dueDate}
          </span>
        )}
        {task.context?.length > 0 && (
          <span className="flex items-center gap-1 flex-wrap">
            {task.context.slice(0, 2).map((tag) => (
              <ContextTag key={tag} label={tag} />
            ))}
            {task.context.length > 2 && (
              <span>+{task.context.length - 2}</span>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
