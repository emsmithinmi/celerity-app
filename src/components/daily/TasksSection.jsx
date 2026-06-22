import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useTasks } from '../../hooks/useTasks'
import { useListOrder } from '../../hooks/useListOrder'
import { EmptyState } from '../ui'
import TaskRow from '../tasks/TaskRow'

const ACTIVE_STATUSES = ['inbox', 'next_action', 'queued', 'waiting', 'scheduled']

const TABS = [
  { key: 'inbox',       label: 'Inbox'        },
  { key: 'next_action', label: 'Next Actions' },
  { key: 'queued',      label: 'Queued'       },
  { key: 'waiting',     label: 'Waiting'      },
  { key: 'scheduled',   label: 'Scheduled'    },
]

export default function TasksSection({ onRefreshStats }) {
  const navigate = useNavigate()
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

  const tabCount = (key) => allTasks.filter(t => t.status === key).length

  // ── Next Actions drag-to-reorder (display-only, localStorage) ───────────────
  const nextActionTasks = useMemo(
    () => allTasks.filter(t => t.status === 'next_action'),
    [allTasks]
  )
  const { ordered, dragOverId, handleDragStart, handleDragOver, handleDrop, handleDragEnd } =
    useListOrder('daily-next-actions-order', nextActionTasks)

  // ── Rendered task list ─────────────────────────────────────────────────────
  const tasks = useMemo(() => {
    if (activeTab === 'next_action') return ordered
    return allTasks.filter(t => t.status === activeTab)
  }, [allTasks, activeTab, ordered])

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
          <EmptyState message="Loading…" />
        ) : tasks.length > 0 ? (
          tasks.map(t => (
            activeTab === 'next_action' ? (
              <div
                key={t.id}
                onDragOver={(e) => handleDragOver(e, t.id)}
                onDrop={() => handleDrop(t.id)}
                className="border-b last:border-b-0"
                style={{
                  borderColor: 'var(--border)',
                  boxShadow: dragOverId === t.id ? 'inset 0 2px 0 0 var(--accent)' : 'none',
                }}
              >
                <TaskRow
                  task={t}
                  onClick={() => navigate(`/tasks/${t.id}`)}
                  reorderable
                  onDragStart={() => handleDragStart(t.id)}
                  onDragEnd={handleDragEnd}
                />
              </div>
            ) : (
              <TaskRow key={t.id} task={t} onClick={() => navigate(`/tasks/${t.id}`)} />
            )
          ))
        ) : (
          <EmptyState message={`No ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()} tasks.`} />
        )}
      </div>
    </div>
  )
}
