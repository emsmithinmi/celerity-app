import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useTasks } from '../../hooks/useTasks'
import { PriorityBadge, EnergyBadge } from '../ui'

const ACTIVE_STATUSES = ['inbox', 'next_action', 'queued', 'waiting', 'scheduled']

const TABS = [
  { key: 'inbox',       label: 'Inbox'        },
  { key: 'next_action', label: 'Next Actions' },
  { key: 'queued',      label: 'Queued'       },
  { key: 'waiting',     label: 'Waiting'      },
  { key: 'scheduled',   label: 'Scheduled'    },
]

function TaskRow({ task }) {
  const navigate   = useNavigate()
  const isWaiting  = task.status === 'waiting'
  const isInbox    = task.status === 'inbox'

  return (
    <div
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:opacity-90 transition-opacity cursor-pointer"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex-1 min-w-0">
        <p
          className="text-sm truncate"
          style={{ color: isWaiting ? 'var(--text-secondary)' : 'var(--text-primary)' }}
        >
          {task.title}
        </p>
        {task.projects?.title && (
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            📁 {task.projects.title}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {task.due_date && (
          <span
            className="text-xs"
            style={{
              color: task.due_date <= new Date().toLocaleDateString('en-CA')
                ? 'var(--danger)'
                : 'var(--text-secondary)',
            }}
          >
            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {task.energy_level && <EnergyBadge energyLevel={task.energy_level} />}
        <PriorityBadge priority={task.priority} />
        {isWaiting && <span title="Waiting">⏳</span>}
        {isInbox   && <span title="Inbox">📥</span>}
      </div>
    </div>
  )
}

export default function TasksSection({ onRefreshStats }) {
  const [activeTab, setActiveTab] = useState('inbox')
  const { tasks: allTasks, loading, refresh } = useTasks({ statuses: ACTIVE_STATUSES })

  // Auto-switch to Next Actions if inbox is empty once data loads
  useEffect(() => {
    if (loading) return
    if (allTasks.filter(t => t.status === 'inbox').length === 0) {
      setActiveTab('next_action')
    }
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps
  const [spinning, setSpinning] = useState(false)
  const handleRefresh = async () => { setSpinning(true); await refresh(); setSpinning(false) }

  const tasks    = useMemo(() => allTasks.filter(t => t.status === activeTab), [allTasks, activeTab])
  const tabCount = (key) => allTasks.filter(t => t.status === key).length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Tasks</h3>
        <button onClick={handleRefresh} title="Refresh tasks" className="flex items-center justify-center rounded-md transition-colors" style={{ width: 26, height: 26, color: 'var(--text-secondary)', background: 'transparent' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
          <RefreshCw size={13} style={{ animation: spinning ? 'spin 0.7s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {TABS.map(tab => {
          const count = tabCount(tab.key)
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
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

      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
      >
        {loading ? (
          <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
        ) : tasks.length > 0 ? (
          tasks.map(t => <TaskRow key={t.id} task={t} />)
        ) : (
          <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            No {TABS.find(t => t.key === activeTab)?.label.toLowerCase()} tasks.
          </p>
        )}
      </div>
    </div>
  )
}
