import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import { usePriorities } from '../../contexts/PrioritiesContext'
import { useAreas }      from '../../contexts/AreasContext'
import { StatusPill, PriorityBadge, FilterControl } from '../ui'

const ACTIVE_STATUSES = ['inbox', 'planning', 'in_progress', 'waiting', 'stalled']

const TABS = [
  { key: 'inbox',       label: 'Inbox'       },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'planning',    label: 'Planning'    },
  { key: 'waiting',     label: 'Waiting'     },
  { key: 'stalled',     label: 'Stalled'     },
]

function ProjectRow({ project }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:opacity-90 transition-opacity cursor-pointer"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {project.title}
        </p>
        {project.area && (
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {project.area}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {project.end_date && (
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Ends {new Date(project.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        <PriorityBadge priority={project.priority} />
      </div>
    </div>
  )
}

export default function ProjectsSection() {
  const [activeTab, setActiveTab] = useState('inbox')
  const [filters,   setFilters]   = useState({})
  const { projects: allProjects, loading, refresh } = useProjects({ statuses: ACTIVE_STATUSES, archived: false })
  const { priorities } = usePriorities()
  const { areas }      = useAreas()

  useEffect(() => {
    if (loading) return
    if (allProjects.filter(p => p.status === 'inbox').length === 0) {
      setActiveTab('in_progress')
    }
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const [spinning, setSpinning] = useState(false)
  const handleRefresh = async () => { setSpinning(true); await refresh(); setSpinning(false) }

  const handleFilterChange = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))
  const hasActiveFilters = Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : !!v)

  const tabCount = (key) => allProjects.filter(p => p.status === key).length

  const filterGroups = [
    priorities.length && { key: 'priority', label: 'Priority', type: 'multi', options: priorities.map(p => ({ value: p.value, label: p.label })) },
    areas.length      && { key: 'area',     label: 'Area',     type: 'multi', options: areas.map(a => ({ value: a.value, label: a.label })) },
  ].filter(Boolean)

  const projects = useMemo(() => {
    let base = allProjects.filter(p => p.status === activeTab)
    if (filters.priority?.length) base = base.filter(p => filters.priority.includes(p.priority))
    if (filters.area?.length)     base = base.filter(p => filters.area.includes(p.area))
    return base
  }, [allProjects, activeTab, filters])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Projects</h3>
        <button onClick={handleRefresh} title="Refresh projects" className="flex items-center justify-center rounded-md transition-colors" style={{ width: 26, height: 26, color: 'var(--text-secondary)', background: 'transparent' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
          <RefreshCw size={13} style={{ animation: spinning ? 'spin 0.7s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Tabs + Filter */}
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
        {filterGroups.length > 0 && (
          <FilterControl groups={filterGroups} values={filters} onChange={handleFilterChange} className="shrink-0" />
        )}
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
      >
        {loading ? (
          <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
        ) : projects.length > 0 ? (
          projects.map(p => <ProjectRow key={p.id} project={p} />)
        ) : (
          <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {hasActiveFilters ? 'No projects match your filters.' : `No ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()} projects.`}
          </p>
        )}
      </div>
    </div>
  )
}
