import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useTasks } from '../../hooks/useTasks'
import { useTaskListSort } from '../../hooks/useListSort'
import { useContextTags } from '../../contexts/ContextTagsContext'
import { usePriorities }   from '../../contexts/PrioritiesContext'
import { useAreas }        from '../../contexts/AreasContext'
import { EmptyState, SortDropdown, FilterControl } from '../ui'
import TaskRow from '../tasks/TaskRow'

const ACTIVE_STATUSES = ['inbox', 'next_action', 'queued', 'waiting', 'someday']

const TABS = [
  { key: 'inbox',       label: 'Inbox'     },
  { key: 'next_action', label: 'Next'      },
  { key: 'queued',      label: 'Queued'    },
  { key: 'waiting',     label: 'Waiting'   },
  { key: 'someday',     label: 'Someday'   },
  { key: 'all',         label: 'All'       },
]

export default function TasksSection({ onRefreshStats }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('inbox')
  const [filters,   setFilters]   = useState({})
  const { tasks: allTasks, loading, refresh } = useTasks({ statuses: ACTIVE_STATUSES })
  const { tags }      = useContextTags()
  const { priorities } = usePriorities()
  const { areas }     = useAreas()

  useEffect(() => {
    if (loading) return
    const order = ['inbox', 'next_action', 'queued', 'waiting', 'someday', 'all']
    const first = order.find(s =>
      s === 'all'
        ? allTasks.length > 0
        : allTasks.filter(t => t.status === s).length > 0
    ) ?? 'all'
    setActiveTab(first)
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const [spinning, setSpinning] = useState(false)
  const handleRefresh = async () => { setSpinning(true); await refresh(); setSpinning(false) }

  const handleFilterChange = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))
  const hasActiveFilters = Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : !!v)

  const tabCount = (key) => key === 'all' ? allTasks.length : allTasks.filter(t => t.status === key).length

  const filterGroups = [
    tags.length       && { key: 'tags',     label: 'Context Tags', type: 'multi', options: tags.map(t => ({ value: t.value, label: t.label })) },
    priorities.length && { key: 'priority', label: 'Priority',     type: 'multi', options: priorities.map(p => ({ value: p.value, label: p.label })) },
    areas.length      && { key: 'area',     label: 'Area',         type: 'multi', options: areas.map(a => ({ value: a.value, label: a.label })) },
  ].filter(Boolean)

  // Next Actions sort + drag-to-reorder
  const nextActionTasks = useMemo(() => allTasks.filter(t => t.status === 'next_action'), [allTasks])
  const sortEnabled = !hasActiveFilters && activeTab === 'next_action'
  const {
    ordered, sortMode, setSortMode, isReorderable, dragOverId,
    handleDragStart, handleDragOver, handleDrop, handleDragEnd,
  } = useTaskListSort('daily:next_action', nextActionTasks, { enabled: sortEnabled })

  const tasks = useMemo(() => {
    let base
    if (activeTab === 'next_action') base = ordered
    else if (activeTab === 'all')    base = allTasks
    else                             base = allTasks.filter(t => t.status === activeTab)

    if (filters.tags?.length)     base = base.filter(t => filters.tags.some(tag => (t.context ?? []).includes(tag)))
    if (filters.priority?.length) base = base.filter(t => filters.priority.includes(t.priority))
    if (filters.area?.length)     base = base.filter(t => filters.area.includes(t.area))
    return base
  }, [allTasks, activeTab, ordered, filters])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Tasks</h3>
        <button onClick={handleRefresh} title="Refresh tasks" className="flex items-center justify-center rounded-md transition-colors" style={{ width: 26, height: 26, color: 'var(--text-secondary)', background: 'transparent' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
          <RefreshCw size={13} style={{ animation: spinning ? 'spin 0.7s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Tabs + Filter + Sort */}
      <div className="flex items-center gap-1 mb-3">
        <div className="flex gap-1 flex-wrap flex-1 min-w-0">
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
        <div className="flex items-center gap-1 shrink-0">
          <FilterControl groups={filterGroups} values={filters} onChange={handleFilterChange} />
          {activeTab === 'next_action' && (
            <SortDropdown value={sortMode} onChange={setSortMode} disabled={!sortEnabled} />
          )}
        </div>
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
      >
        {loading ? (
          <EmptyState message="Loading…" />
        ) : tasks.length > 0 ? (
          tasks.map(t => (
            activeTab === 'next_action' && isReorderable ? (
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
          <EmptyState message={hasActiveFilters ? 'No tasks match your filters.' : `No ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()} tasks.`} />
        )}
      </div>
    </div>
  )
}
