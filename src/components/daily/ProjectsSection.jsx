import { useState } from 'react'
import { useProjects } from '../../hooks/useProjects'
import { StatusPill, PriorityBadge } from '../ui'

const TABS = [
  { key: 'in_progress', label: 'In Progress' },
  { key: 'planning',    label: 'Planning'    },
  { key: 'waiting',     label: 'Waiting'     },
  { key: 'stalled',     label: 'Stalled'     },
]

function ProjectRow({ project }) {
  return (
    <div
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
            Due {new Date(project.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        <PriorityBadge priority={project.priority} />
      </div>
    </div>
  )
}

export default function ProjectsSection() {
  const [activeTab, setActiveTab] = useState('in_progress')
  const { projects, loading } = useProjects({ status: activeTab, archived: false })

  return (
    <div>
      <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
        Projects
      </h3>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: activeTab === tab.key ? 'var(--border)' : 'transparent',
              color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
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
            No {TABS.find(t => t.key === activeTab)?.label.toLowerCase()} projects.
          </p>
        )}
      </div>
    </div>
  )
}
