import { useState } from 'react'
import { useTasks } from '../../hooks/useTasks'
import { createTask } from '../../lib/api/tasks'
import { StatusPill, PriorityBadge } from '../ui'
import TaskDetail from '../tasks/TaskDetail'

const STATUS_TABS = [
  { key: 'active',      label: 'Active'       },
  { key: 'inbox',       label: 'Inbox'        },
  { key: 'next_action', label: 'Next Actions' },
  { key: 'queued',      label: 'Queued'       },
  { key: 'waiting',     label: 'Waiting'      },
  { key: 'done',        label: 'Done'         },
]

const ACTIVE = ['inbox', 'next_action', 'queued', 'scheduled', 'waiting']

function MiniTaskRow({ task, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 cursor-pointer hover:opacity-90 transition-opacity"
      style={{ borderColor: 'var(--border)' }}
    >
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
  const [tab,          setTab]          = useState('active')
  const [newTitle,     setNewTitle]     = useState('')
  const [addingTask,   setAddingTask]   = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)

  const { tasks, loading, refresh } = useTasks({ project_id: projectId })

  const displayed = tab === 'active'
    ? tasks.filter(t => ACTIVE.includes(t.status))
    : tasks.filter(t => t.status === tab)

  // Count by status for tabs
  const counts = {
    active:      tasks.filter(t => ACTIVE.includes(t.status)).length,
    inbox:       tasks.filter(t => t.status === 'inbox').length,
    next_action: tasks.filter(t => t.status === 'next_action').length,
    queued:      tasks.filter(t => t.status === 'queued').length,
    waiting:     tasks.filter(t => t.status === 'waiting').length,
    done:        tasks.filter(t => t.status === 'done').length,
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
        {/* Status tabs with counts */}
        <div className="flex gap-1 flex-wrap">
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

        {/* Task list */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
        >
          {loading ? (
            <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
          ) : displayed.length > 0 ? (
            displayed.map(t => (
              <MiniTaskRow key={t.id} task={t} onClick={() => setSelectedTask(t)} />
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

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onRefresh={() => { refresh(); setSelectedTask(null) }}
        />
      )}
    </>
  )
}
