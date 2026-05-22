import { useState } from 'react'
import { Pencil, Trash2, FolderKanban } from 'lucide-react'
import { StatusPill, PriorityBadge, ContextTag, Button } from '../ui'
import { TASK_STATUSES, BUTTON_LABELS } from '../../lib/constants'
import TaskForm from './TaskForm'

// Which status transitions are available from each status
const TRANSITIONS = {
  inbox: [
    { to: 'next_action', label: BUTTON_LABELS.NEXT_ACTION,    variant: 'primary' },
    { to: 'queued',      label: BUTTON_LABELS.QUEUE,          variant: 'secondary' },
    { to: 'scheduled',   label: BUTTON_LABELS.SCHEDULE,       variant: 'secondary' },
    { to: 'waiting',     label: BUTTON_LABELS.WAITING,        variant: 'secondary' },
    { to: 'someday',     label: BUTTON_LABELS.SOMEDAY,        variant: 'ghost' },
    { to: 'done',        label: BUTTON_LABELS.DONE,           variant: 'secondary' },
  ],
  next_action: [
    { to: 'done',        label: BUTTON_LABELS.DONE,           variant: 'primary' },
    { to: 'queued',      label: BUTTON_LABELS.QUEUE,          variant: 'secondary' },
    { to: 'waiting',     label: BUTTON_LABELS.WAITING,        variant: 'secondary' },
    { to: 'someday',     label: BUTTON_LABELS.SOMEDAY,        variant: 'ghost' },
  ],
  queued: [
    { to: 'next_action', label: BUTTON_LABELS.NEXT_ACTION,    variant: 'primary' },
    { to: 'done',        label: BUTTON_LABELS.DONE,           variant: 'secondary' },
    { to: 'waiting',     label: BUTTON_LABELS.WAITING,        variant: 'secondary' },
    { to: 'someday',     label: BUTTON_LABELS.SOMEDAY,        variant: 'ghost' },
  ],
  scheduled: [
    { to: 'next_action', label: BUTTON_LABELS.NEXT_ACTION,    variant: 'primary' },
    { to: 'done',        label: BUTTON_LABELS.DONE,           variant: 'secondary' },
    { to: 'waiting',     label: BUTTON_LABELS.WAITING,        variant: 'secondary' },
  ],
  waiting: [
    { to: 'next_action', label: BUTTON_LABELS.NEXT_ACTION,    variant: 'primary' },
    { to: 'done',        label: BUTTON_LABELS.DONE,           variant: 'secondary' },
    { to: 'someday',     label: BUTTON_LABELS.SOMEDAY,        variant: 'ghost' },
  ],
  someday: [
    { to: 'next_action', label: BUTTON_LABELS.NEXT_ACTION,    variant: 'primary' },
    { to: 'inbox',       label: 'Back to Inbox',              variant: 'secondary' },
    { to: 'done',        label: BUTTON_LABELS.DONE,           variant: 'secondary' },
  ],
  done: [
    { to: 'inbox',       label: 'Reopen',                     variant: 'secondary' },
  ],
}

export default function TaskDetail({ task, onUpdate, onDelete, onClose, projects = [] }) {
  const [editing, setEditing] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  const transitions = TRANSITIONS[task.status] || []

  const dueDate = task.due_date
    ? new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      })
    : null

  const isOverdue =
    task.due_date &&
    new Date(task.due_date + 'T00:00:00') < new Date() &&
    task.status !== 'done'

  const handleTransition = async (toStatus) => {
    setTransitioning(true)
    await onUpdate(task.id, { status: toStatus })
    setTransitioning(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${task.title}"? This can't be undone.`)) return
    await onDelete(task.id)
    onClose()
  }

  if (editing) {
    return (
      <TaskForm
        initial={task}
        projects={projects}
        submitLabel="Save Changes"
        onSubmit={async (data) => {
          await onUpdate(task.id, data)
          setEditing(false)
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="p-5 space-y-6">
      {/* Title + status */}
      <div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <StatusPill status={task.status} type="task" />
          {task.priority && <PriorityBadge priority={task.priority} />}
        </div>
        <h2
          className={`text-lg font-semibold leading-snug ${
            task.status === 'done' ? 'line-through text-app-muted' : 'text-app-text'
          }`}
        >
          {task.title}
        </h2>
      </div>

      {/* Stat tiles */}
      {(task.area || dueDate || task.projects || task.created_at) && (
        <div className="grid grid-cols-2 gap-2">
          {task.area && (
            <div className="bg-app-bg rounded-lg p-3">
              <p className="text-xs text-app-muted mb-1">Area</p>
              <p className="text-sm font-medium text-app-text">{task.area}</p>
            </div>
          )}
          {dueDate && (
            <div className={`bg-app-bg rounded-lg p-3 ${isOverdue ? 'ring-1 ring-red-500/50' : ''}`}>
              <p className="text-xs text-app-muted mb-1">Due</p>
              <p className={`text-sm font-medium ${isOverdue ? 'text-red-400' : 'text-app-text'}`}>
                {dueDate}
              </p>
            </div>
          )}
          {task.projects && (
            <div className="bg-app-bg rounded-lg p-3">
              <p className="text-xs text-app-muted mb-1">Project</p>
              <p className="text-sm font-medium text-app-text flex items-center gap-1">
                <FolderKanban size={12} />
                {task.projects.title}
              </p>
            </div>
          )}
          {task.created_at && (
            <div className="bg-app-bg rounded-lg p-3">
              <p className="text-xs text-app-muted mb-1">Created</p>
              <p className="text-sm text-app-muted">
                {new Date(task.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {task.notes && (
        <div>
          <p className="text-xs font-semibold text-app-muted uppercase tracking-widest mb-2">
            Notes
          </p>
          <p className="text-sm text-app-text leading-relaxed whitespace-pre-wrap">
            {task.notes}
          </p>
        </div>
      )}

      {/* Context tags */}
      {task.context?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-app-muted uppercase tracking-widest mb-2">
            Context
          </p>
          <div className="flex flex-wrap gap-2">
            {task.context.map((tag) => (
              <ContextTag key={tag} label={tag} />
            ))}
          </div>
        </div>
      )}

      {/* Status transitions */}
      {transitions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-app-muted uppercase tracking-widest mb-2">
            Move To
          </p>
          <div className="flex flex-col gap-2">
            {transitions.map(({ to, label, variant }) => (
              <Button
                key={to}
                variant={variant}
                size="sm"
                onClick={() => handleTransition(to)}
                disabled={transitioning}
                className="justify-start"
              >
                <span className="mr-1" aria-hidden="true">
                  {TASK_STATUSES[to]?.icon}
                </span>
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Edit / Delete */}
      <div className="flex items-center gap-2 pt-2 border-t border-app-border">
        <Button
          variant="secondary"
          size="sm"
          icon={<Pencil size={12} />}
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>
        <Button
          variant="danger"
          size="sm"
          icon={<Trash2 size={12} />}
          onClick={handleDelete}
        >
          Delete
        </Button>
      </div>
    </div>
  )
}
