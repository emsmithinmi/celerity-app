import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTasks } from '../../hooks/useTasks'
import { useTaskListSort } from '../../hooks/useListSort'
import { createTask } from '../../lib/api/tasks'
import { StatusPill, PriorityBadge, DragHandle, SortDropdown } from '../ui'

const STATUS_TABS = [
  { key: 'inbox',       label: 'Inbox'     },
  { key: 'next_action', label: 'Next'      },
  { key: 'queued',      label: 'Queued'    },
  { key: 'waiting',     label: 'Waiting'   },
  { key: 'someday',     label: 'Someday'   },
  { key: 'done',        label: 'Done'      },
  { key: 'all',         label: 'All'       },
]

const ACTIVE = ['inbox', 'next_action', 'queued', 'waiting', 'someday']

function MiniTaskRow({ task, reorderable = false, onDragStart, onDragEnd }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 cursor-pointer hover:opacity-90 transition-opacity"
      style={{ borderColor: 'var(--border)' }}
    >
      {reorderable && <DragHandle onDragStart={onDragStart} onDragEnd={onDragEnd} className="-ml-1" />}
      <StatusPill status={task.status} type="task" />
      <span
        className="flex-1 text-sm truncate"
        style={{
          color: task.status === 'done' ? 'var(--text-secondary)' : 'var(--text-primary)',
          textDecoration: task.status === 'done' ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </span>
      <PriorityBadge priority={task.priority} />
    </div>
  )
}

export default function ProjectTaskList({ projectId, onTaskCountChange }) {
  const [tab,        setTab]        = useState('inbox')
  const [newTitle,   setNewTitle]   = useState('')
  const [addingTask, setAddingTask] = useState(false)

  const { tasks, loading, refresh } = useTasks({ project_id: projectId })

  // Auto-switch to first populated tab in GTD order
  useEffect(() => {
    if (loading) return
    const order = ['inbox', 'next_action', 'queued', 'waiting', 'someday', 'done', 'all']
    const first = order.find(s =>
      s === 'all'
        ? tasks.filter(t => ACTIVE.includes(t.status)).length > 0
        : tasks.filter(t => t.status === s).length > 0
    ) ?? 'all'
    setTab(first)
  }, [loading, tasks])

  const displayed = tab === 'all'
    ? tasks.filter(t => ACTIVE.includes(t.status))
    : tasks.filter(t => t.status === tab)

  // Per-tab sort + manual order, synced via list_preferences (per project).
  const {
    ordered, sortMode, setSortMode, isReorderable, dragOverId,
    handleDragStart, handleDragOver, handleDrop, handleDragEnd,
  } = useTaskListSort(`project:${projectId}:${tab}`, displayed)

  // Count by status for tabs
  const counts = {
    inbox:       tasks.filter(t => t.status === 'inbox').length,
    next_action: tasks.filter(t => t.status === 'next_action').length,
    queued:      tasks.filter(t => t.status === 'queued').length,
    waiting:     tasks.filter(t => t.status === 'waiting').length,
    someday:     tasks.filter(t => t.status === 'someday').length,
    done:        tasks.filter(t => t.status === 'done').length,
    all:         tasks.filter(t => ACTIVE.includes(t.status)).length,
  }

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setAddingTask(true)
    await createTask({ title: newTitle.trim(), project_id: projectId, status: 'inbox' })
    setNewTitle('')
    await refresh()
    onTaskCountChange?.()
    setAddingTask(false)
  }

  return (
    <>
      <div className="space-y-3">
        {/* Status tabs with counts + sort */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 flex-wrap flex-1 min-w-0">
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: tab === t.key ? 'var(--border)' : 'transparent',
                color: tab === t.key ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-xs"
                  style={{ backgroundColor: 'var(--app-bg)', color: 'var(--accent)' }}
                >
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
          </div>
          <SortDropdown value={sortMode} onChange={setSortMode} className="shrink-0" />
        </div>

        {/* Task list */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
        >
          {loading ? (
            <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
          ) : ordered.length > 0 ? (
            ordered.map(t => (
              isReorderable ? (
                <div
                  key={t.id}
                  onDragOver={(e) => handleDragOver(e, t.id)}
                  onDrop={() => handleDrop(t.id)}
                  style={{ boxShadow: dragOverId === t.id ? 'inset 0 2px 0 0 var(--accent)' : 'none' }}
                >
                  <MiniTaskRow
                    task={t}
                    reorderable
                    onDragStart={() => handleDragStart(t.id)}
                    onDragEnd={handleDragEnd}
                  />
                </div>
              ) : (
                <MiniTaskRow key={t.id} task={t} />
              )
            ))
          ) : (
            <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              No {STATUS_TABS.find(s => s.key === tab)?.label.toLowerCase()} tasks.
            </p>
          )}
        </div>

        {/* Quick add task */}
        <form onSubmit={handleAddTask} className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Add a task to this project…"
            className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || addingTask}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
            style={{ backgroundColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            {addingTask ? '…' : 'Add'}
          </button>
        </form>

        {/* Task count summary */}
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {tasks.length} total task{tasks.length !== 1 ? 's' : ''} —&nbsp;
          {counts.next_action} next action{counts.next_action !== 1 ? 's' : ''},&nbsp;
          {counts.waiting} waiting,&nbsp;
          {counts.done} done
        </p>
      </div>

    </>
  )
}
