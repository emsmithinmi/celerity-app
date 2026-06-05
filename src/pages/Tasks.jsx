import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTasks } from '../hooks/useTasks'
import TaskRow from '../components/tasks/TaskRow'
import Button from '../components/ui/Button'
import { CaptureTaskModal } from '../components/daily/QuickCaptureModals'

const TABS = [
  { key: 'inbox',       label: 'Inbox'        },
  { key: 'next_action', label: 'Next Actions' },
  { key: 'queued',      label: 'Queued'       },
  { key: 'waiting',     label: 'Waiting'      },
  { key: 'scheduled',   label: 'Scheduled'    },
  { key: 'someday',     label: 'Someday'      },
  { key: 'done',        label: 'Done'         },
  { key: 'all',         label: 'All Active'   },
]

const ALL_ACTIVE = ['inbox', 'next_action', 'queued', 'scheduled', 'waiting', 'someday']

function StatChip({ label, count }) {
  return (
    <div
      className="flex flex-col items-center px-4 py-3 rounded-xl border"
      style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
    >
      <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{count}</span>
      <span className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  )
}

export default function Tasks() {
  const navigate = useNavigate()
  const [activeTab,   setActiveTab]   = useState('inbox')
  const [showCapture, setShowCapture] = useState(false)
  const [search,      setSearch]      = useState('')

  const { tasks, loading, refresh, createTask } = useTasks({})

  useEffect(() => {
    if (!loading && tasks.filter(t => t.status === 'inbox').length === 0) {
      setActiveTab('next_action')
    }
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const displayed = (() => {
    let base = activeTab === 'all'
      ? tasks.filter(t => ALL_ACTIVE.includes(t.status))
      : tasks.filter(t => t.status === activeTab)
    if (search) base = base.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    return base
  })()

  const stats = {
    active:  tasks.filter(t => ALL_ACTIVE.includes(t.status)).length,
    inbox:   tasks.filter(t => t.status === 'inbox').length,
    next:    tasks.filter(t => t.status === 'next_action').length,
    waiting: tasks.filter(t => t.status === 'waiting').length,
  }

  const tabCount = (key) => {
    if (key === 'all') return tasks.filter(t => ALL_ACTIVE.includes(t.status)).length
    return tasks.filter(t => t.status === key).length
  }

  const handleCapture = async (title) => {
    await createTask(title)
    refresh()
    setActiveTab('inbox')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Tasks</h1>
        <Button size="sm" variant="primary" onClick={() => setShowCapture(true)}>+ New Task</Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3 px-6 pt-5 pb-4">
          <StatChip label="Active"  count={stats.active}  />
          <StatChip label="Inbox"   count={stats.inbox}   />
          <StatChip label="Next"    count={stats.next}    />
          <StatChip label="Waiting" count={stats.waiting} />
        </div>

        {/* Search */}
        <div className="px-6 pb-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full px-4 py-2 rounded-xl text-sm border outline-none bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 px-4 pb-2 overflow-x-auto shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {TABS.map(tab => {
            const count = tabCount(tab.key)
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0"
                style={{
                  backgroundColor: activeTab === tab.key ? 'var(--border)' : 'transparent',
                  color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none"
                    style={{
                      backgroundColor: activeTab === tab.key ? 'var(--text-secondary)' : 'var(--border)',
                      color: activeTab === tab.key ? 'var(--pane-bg)' : 'var(--text-secondary)',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Task list */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {search
                ? 'No tasks match your search.'
                : `No ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()} tasks.`}
            </p>
            {activeTab === 'inbox' && !search && (
              <Button size="sm" variant="secondary" onClick={() => setShowCapture(true)}>
                Capture something
              </Button>
            )}
          </div>
        ) : (
          <div style={{ backgroundColor: 'var(--pane-bg)' }}>
            {displayed.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onClick={() => navigate(`/tasks/${task.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <CaptureTaskModal
        open={showCapture}
        onClose={() => setShowCapture(false)}
        onCreate={handleCapture}
      />
    </div>
  )
}
