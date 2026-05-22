import { useState, useEffect } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { StatusPill, PriorityBadge, Button } from '../ui'
import { TASK_STATUSES, TASK_STATUS_ORDER, BUTTON_LABELS } from '../../lib/constants'
import { TaskCard } from '../tasks'
import { supabase } from '../../lib/supabase'
import ProjectForm from './ProjectForm'

const OPEN_STATUSES = new Set(['inbox', 'next_action', 'queued', 'scheduled', 'waiting'])

const TRANSITIONS = {
  inbox: [
    { to: 'planning',    label: 'Start Planning',              variant: 'primary' },
    { to: 'in_progress', label: BUTTON_LABELS.SET_IN_PROGRESS, variant: 'secondary' },
    { to: 'waiting',     label: BUTTON_LABELS.WAITING,         variant: 'secondary' },
    { to: 'completed',   label: BUTTON_LABELS.DONE,            variant: 'secondary', blocking: true },
  ],
  planning: [
    { to: 'in_progress', label: BUTTON_LABELS.SET_IN_PROGRESS, variant: 'primary' },
    { to: 'waiting',     label: BUTTON_LABELS.WAITING,         variant: 'secondary' },
    { to: 'inbox',       label: 'Back to Inbox',               variant: 'ghost' },
  ],
  in_progress: [
    { to: 'completed',   label: BUTTON_LABELS.DONE,            variant: 'primary',   blocking: true },
    { to: 'waiting',     label: BUTTON_LABELS.WAITING,         variant: 'secondary' },
    { to: 'inbox',       label: 'Back to Inbox',               variant: 'ghost' },
  ],
  waiting: [
    { to: 'in_progress', label: BUTTON_LABELS.SET_IN_PROGRESS, variant: 'primary' },
    { to: 'completed',   label: BUTTON_LABELS.DONE,            variant: 'secondary', blocking: true },
  ],
  completed: [
    { to: 'in_progress', label: 'Reopen',                      variant: 'secondary' },
  ],
}

export default function ProjectDetail({ project, onUpdate, onDelete, onClose, onSelectTask }) {
  const [tasks,        setTasks]        = useState([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [editing,      setEditing]      = useState(false)
  const [transitioning,setTransitioning]= useState(false)

  useEffect(() => {
    const fetch = async () => {
      setLoadingTasks(true)
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
      setTasks(data || [])
      setLoadingTasks(false)
    }
    fetch()
  }, [project.id])

  const openCount   = tasks.filter((t) => OPEN_STATUSES.has(t.status)).length
  const hasOpen     = openCount > 0
  const transitions = TRANSITIONS[project.status] || []

  const taskCounts = TASK_STATUS_ORDER.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s).length
    return acc
  }, {})

  const taskGroups = TASK_STATUS_ORDER
    .map((status) => ({
      status,
      label: TASK_STATUSES[status].label,
      icon:  TASK_STATUSES[status].icon,
      tasks: tasks.filter((t) => t.status === status),
    }))
    .filter((g) => g.tasks.length > 0)

  const handleTransition = async (toStatus, blocking) => {
    if (blocking && hasOpen) return
    setTransitioning(true)
    await onUpdate(project.id, { status: toStatus })
    setTransitioning(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${project.title}"? This can't be undone.`)) return
    await onDelete(project.id)
    onClose()
  }

  const fmt = (dateStr) =>
    dateStr
      ? new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        })
      : null

  const isOverdue =
    project.end_date &&
    new Date(project.end_date + 'T00:00:00') < new Date() &&
    project.status !== 'completed'

  if (editing) {
    return (
      <ProjectForm
        initial={project}
        submitLabel="Save Changes"
        onSubmit={async (data) => { await onUpdate(project.id, data); setEditing(false) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="p-5 space-y-6">
      {/* Title + badges */}
      <div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <StatusPill status={project.status} type="project" />
          {project.priority && <PriorityBadge priority={project.priority} />}
        </div>
        <h2
          className={`text-lg font-semibold leading-snug ${
            project.status === 'completed' ? 'line-through text-app-muted' : 'text-app-text'
          }`}
        >
          {project.title}
        </h2>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-2">
        {project.area && (
          <div className="bg-app-bg rounded-lg p-3">
            <p className="text-xs text-app-muted mb-1">Area</p>
            <p className="text-sm font-medium text-app-text">{project.area}</p>
          </div>
        )}
        {fmt(project.start_date) && (
          <div className="bg-app-bg rounded-lg p-3">
            <p className="text-xs text-app-muted mb-1">Start</p>
            <p className="text-sm text-app-text">{fmt(project.start_date)}</p>
          </div>
        )}
        {fmt(project.end_date) && (
          <div className={`bg-app-bg rounded-lg p-3 ${isOverdue ? 'ring-1 ring-red-500/50' : ''}`}>
            <p className="text-xs text-app-muted mb-1">End</p>
            <p className={`text-sm ${isOverdue ? 'text-red-400' : 'text-app-text'}`}>
              {fmt(project.end_date)}
            </p>
          </div>
        )}
        {tasks.length > 0 && (
          <div className="bg-app-bg rounded-lg p-3">
            <p className="text-xs text-app-muted mb-1">Progress</p>
            <p className="text-sm font-medium text-app-text">
              {taskCounts.done} / {tasks.length} done
            </p>
          </div>
        )}
      </div>

      {/* Description */}
      {project.description && (
        <div>
          <p className="text-xs font-semibold text-app-muted uppercase tracking-widest mb-2">
            Description
          </p>
          <p className="text-sm text-app-text leading-relaxed whitespace-pre-wrap">
            {project.description}
          </p>
        </div>
      )}

      {/* Waiting for */}
      {project.waiting_for && (
        <div>
          <p className="text-xs font-semibold text-app-muted uppercase tracking-widest mb-2">
            Waiting For
          </p>
          <p className="text-sm text-app-text">{project.waiting_for}</p>
        </div>
      )}

      {/* Task rollup */}
      {tasks.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-app-muted uppercase tracking-widest mb-2">
            Task Rollup
          </p>
          <div className="flex flex-wrap gap-2">
            {TASK_STATUS_ORDER.filter((s) => taskCounts[s] > 0).map((s) => (
              <div
                key={s}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-app-bg text-xs"
              >
                <span aria-hidden="true">{TASK_STATUSES[s].icon}</span>
                <span className="text-app-muted">{TASK_STATUSES[s].label}</span>
                <span className="font-semibold text-app-text">{taskCounts[s]}</span>
              </div>
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
          {hasOpen && transitions.some((t) => t.blocking) && (
            <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2 mb-2">
              {openCount} open task{openCount !== 1 ? 's' : ''} must be resolved before completing.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {transitions.map(({ to, label, variant, blocking }) => (
              <Button
                key={to}
                variant={variant}
                size="sm"
                onClick={() => handleTransition(to, blocking)}
                disabled={transitioning || (blocking && hasOpen)}
                className="justify-start"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Tasks grouped by status */}
      {loadingTasks && tasks.length === 0 ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-app-bg rounded-xl animate-pulse" />
          ))}
        </div>
      ) : taskGroups.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-app-muted uppercase tracking-widest mb-3">
            Tasks
          </p>
          <div className="space-y-5">
            {taskGroups.map((group) => (
              <div key={group.status}>
                <h4 className="text-xs text-app-muted flex items-center gap-1.5 mb-2">
                  <span aria-hidden="true">{group.icon}</span>
                  {group.label}
                  <span>({group.tasks.length})</span>
                </h4>
                <div className="space-y-2">
                  {group.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => onSelectTask?.(task)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
