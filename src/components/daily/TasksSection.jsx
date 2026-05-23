import { useState } from 'react'
import { useTasks } from '../../hooks/useTasks'
import { PriorityBadge, EnergyBadge } from '../ui'

const TABS = [
  { key: 'next_action', label: 'Next Actions' },
  { key: 'inbox',       label: 'Inbox'        },
  { key: 'queued',      label: 'Queued'       },
  { key: 'waiting',     label: 'Waiting'      },
  { key: 'scheduled',   label: 'Scheduled'    },
]

function TaskRow({ task }) {
  const isWaiting  = task.status === 'waiting'
  const isInbox    = task.status === 'inbox'

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:opacity-90 transition-opacity cursor-pointer"
      style={{ borderColor: '#313244' }}
    >
      <div className="flex-1 min-w-0">
        <p
          className="text-sm truncate"
          style={{ color: isWaiting ? '#6c7086' : '#cdd6f4' }}
        >
          {task.title}
        </p>
        {task.projects?.title && (
          <p className="text-xs truncate mt-0.5" style={{ color: '#6c7086' }}>
            📁 {task.projects.title}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {task.due_date && (
          <span
            className="text-xs"
            style={{
              color: task.due_date <= new Date().toISOString().split('T')[0]
                ? '#DB4437'
                : '#6c7086',
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
  const [activeTab, setActiveTab] = useState('next_action')
  const { tasks, loading } = useTasks({ status: activeTab })

  return (
    <div>
      <h3 className="text-base font-semibold mb-3" style={{ color: '#cdd6f4' }}>
        Tasks
      </h3>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: activeTab === tab.key ? '#313244' : 'transparent',
              color: activeTab === tab.key ? '#cdd6f4' : '#6c7086',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: '#181825', borderColor: '#313244' }}
      >
        {loading ? (
          <p className="px-4 py-3 text-sm" style={{ color: '#6c7086' }}>Loading…</p>
        ) : tasks.length > 0 ? (
          tasks.map(t => <TaskRow key={t.id} task={t} />)
        ) : (
          <p className="px-4 py-3 text-sm" style={{ color: '#6c7086' }}>
            No {TABS.find(t => t.key === activeTab)?.label.toLowerCase()} tasks.
          </p>
        )}
      </div>
    </div>
  )
}
