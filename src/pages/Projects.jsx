import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjects } from '../hooks/useProjects'
import ProjectRow from '../components/projects/ProjectRow'
import Button from '../components/ui/Button'
import { CaptureProjectModal } from '../components/daily/QuickCaptureModals'

const TABS = [
  { key: 'all',         label: 'All Active'  },
  { key: 'inbox',       label: 'Inbox'       },
  { key: 'planning',    label: 'Planning'    },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'waiting',     label: 'Waiting'     },
  { key: 'stalled',     label: 'Stalled'     },
  { key: 'completed',   label: 'Completed'   },
  { key: 'archived',    label: 'Archived'    },
]

const ALL_ACTIVE_STATUSES = ['inbox', 'planning', 'in_progress', 'waiting', 'stalled']

function StatChip({ label, count }) {
  return (
    <div
      className="flex flex-col items-center px-4 py-3 rounded-xl border"
      style={{ backgroundColor: '#181825', borderColor: '#313244' }}
    >
      <span className="text-2xl font-bold" style={{ color: '#cdd6f4' }}>{count}</span>
      <span className="text-xs mt-0.5" style={{ color: '#6c7086' }}>{label}</span>
    </div>
  )
}

export default function Projects() {
  const navigate = useNavigate()
  const [activeTab,   setActiveTab]   = useState('all')
  const [showCapture, setShowCapture] = useState(false)
  const [search,      setSearch]      = useState('')

  const { projects, loading, refresh, createProject } = useProjects({})

  const displayed = (() => {
    let base
    if (activeTab === 'all') base = projects.filter(p => ALL_ACTIVE_STATUSES.includes(p.status) && !p.archived_at)
    else if (activeTab === 'archived') base = projects.filter(p => !!p.archived_at)
    else if (activeTab === 'completed') base = projects.filter(p => p.status === 'completed')
    else base = projects.filter(p => p.status === activeTab && !p.archived_at)
    if (search) base = base.filter(p =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.area ?? '').toLowerCase().includes(search.toLowerCase())
    )
    return base
  })()

  const stats = {
    active:      projects.filter(p => ALL_ACTIVE_STATUSES.includes(p.status) && !p.archived_at).length,
    in_progress: projects.filter(p => p.status === 'in_progress' && !p.archived_at).length,
    stalled:     projects.filter(p => p.status === 'stalled' && !p.archived_at).length,
    waiting:     projects.filter(p => p.status === 'waiting' && !p.archived_at).length,
  }

  const handleCapture = async (title) => {
    await createProject(title)
    refresh()
    setActiveTab('inbox')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: '#313244' }}
      >
        <h1 className="text-xl font-semibold" style={{ color: '#cdd6f4' }}>Projects</h1>
        <Button size="sm" variant="primary" onClick={() => setShowCapture(true)}>+ New Project</Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3 px-6 pt-5 pb-4">
          <StatChip label="Active"      count={stats.active}      />
          <StatChip label="In Progress" count={stats.in_progress} />
          <StatChip label="Stalled"     count={stats.stalled}     />
          <StatChip label="Waiting"     count={stats.waiting}     />
        </div>

        {/* Search */}
        <div className="px-6 pb-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full px-4 py-2 rounded-xl text-sm border outline-none bg-transparent"
            style={{ borderColor: '#313244', color: '#cdd6f4' }}
          />
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 px-4 pb-2 overflow-x-auto shrink-0"
          style={{ borderBottom: '1px solid #313244' }}
        >
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0"
              style={{
                backgroundColor: activeTab === tab.key ? '#313244' : 'transparent',
                color: activeTab === tab.key ? '#cdd6f4' : '#6c7086',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Project list */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={{ color: '#6c7086' }}>Loading…</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <p className="text-sm" style={{ color: '#6c7086' }}>
              {search
                ? 'No projects match your search.'
                : `No ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()} projects.`}
            </p>
            {activeTab === 'inbox' && !search && (
              <Button size="sm" variant="secondary" onClick={() => setShowCapture(true)}>
                Capture something
              </Button>
            )}
          </div>
        ) : (
          <div style={{ backgroundColor: '#181825' }}>
            {displayed.map(project => (
              <ProjectRow
                key={project.id}
                project={project}
                onClick={() => navigate(`/projects/${project.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <CaptureProjectModal
        open={showCapture}
        onClose={() => setShowCapture(false)}
        onCreate={handleCapture}
      />
    </div>
  )
}
