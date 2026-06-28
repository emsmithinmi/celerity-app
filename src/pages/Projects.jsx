import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjects } from '../hooks/useProjects'
import { usePriorities } from '../contexts/PrioritiesContext'
import { useAreas }      from '../contexts/AreasContext'
import ProjectRow from '../components/projects/ProjectRow'
import Button from '../components/ui/Button'
import { EmptyState, FilterControl } from '../components/ui'
import { CaptureProjectModal } from '../components/daily/QuickCaptureModals'
import { updateProject, archiveProject, scrapeProject, duplicateProject } from '../lib/api/projects'

const TABS = [
  { key: 'inbox',       label: 'Inbox'          },
  { key: 'planning',    label: 'Planning'        },
  { key: 'in_progress', label: 'In Progress'     },
  { key: 'waiting',     label: 'Waiting'         },
  { key: 'stalled',     label: 'Stalled'         },
  { key: 'someday',     label: 'Someday/Maybe'   },
  { key: 'completed',   label: 'Completed'       },
  { key: 'archived',    label: 'Archived'        },
  { key: 'all',         label: 'All Active'      },
]

const ALL_ACTIVE_STATUSES = ['inbox', 'planning', 'in_progress', 'waiting', 'stalled']

export default function Projects() {
  const navigate = useNavigate()
  const [activeTab,   setActiveTab]   = useState('inbox')
  const [showCapture, setShowCapture] = useState(false)
  const [search,      setSearch]      = useState('')
  const [selectMode,  setSelectMode]  = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkStatus,  setBulkStatus]  = useState('')
  const [bulkWorking, setBulkWorking] = useState(false)
  const [filters,     setFilters]     = useState({})

  const { projects, loading, refresh, createProject } = useProjects({})
  const { priorities } = usePriorities()
  const { areas }      = useAreas()

  useEffect(() => {
    if (!loading && projects.filter(p => p.status === 'inbox' && !p.archived_at).length === 0) {
      setActiveTab('in_progress')
    }
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))
  const hasActiveFilters = Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : !!v)

  const displayed = (() => {
    let base
    if (activeTab === 'all')      base = projects.filter(p => ALL_ACTIVE_STATUSES.includes(p.status) && !p.archived_at)
    else if (activeTab === 'archived') base = projects.filter(p => !!p.archived_at)
    else if (activeTab === 'completed') base = projects.filter(p => p.status === 'completed')
    else base = projects.filter(p => p.status === activeTab && !p.archived_at)

    if (search) base = base.filter(p =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.area ?? '').toLowerCase().includes(search.toLowerCase())
    )
    if (filters.priority?.length) base = base.filter(p => filters.priority.includes(p.priority))
    if (filters.area?.length)     base = base.filter(p => filters.area.includes(p.area))
    if (filters.endDate) {
      const today = new Date().toLocaleDateString('en-CA')
      const d30 = new Date(); d30.setDate(d30.getDate() + 30)
      const month = d30.toLocaleDateString('en-CA')
      const d90 = new Date(); d90.setDate(d90.getDate() + 90)
      const quarter = d90.toLocaleDateString('en-CA')
      if (filters.endDate === 'overdue')      base = base.filter(p => p.end_date && p.end_date < today)
      if (filters.endDate === 'this_month')   base = base.filter(p => p.end_date && p.end_date >= today && p.end_date <= month)
      if (filters.endDate === 'this_quarter') base = base.filter(p => p.end_date && p.end_date >= today && p.end_date <= quarter)
      if (filters.endDate === 'upcoming')     base = base.filter(p => p.end_date && p.end_date >= today)
    }
    return base
  })()

  const tabCount = (key) => {
    if (key === 'all')       return projects.filter(p => ALL_ACTIVE_STATUSES.includes(p.status) && !p.archived_at).length
    if (key === 'archived')  return projects.filter(p => !!p.archived_at).length
    if (key === 'completed') return projects.filter(p => p.status === 'completed').length
    return projects.filter(p => p.status === key && !p.archived_at).length
  }

  const filterGroups = [
    priorities.length && { key: 'priority', label: 'Priority',   type: 'multi',  options: priorities.map(p => ({ value: p.value, label: p.label })) },
    areas.length      && { key: 'area',     label: 'Area',       type: 'multi',  options: areas.map(a => ({ value: a.value, label: a.label })) },
    { key: 'endDate', label: 'End Date', type: 'single', options: [
      { value: 'overdue',      label: 'Overdue'      },
      { value: 'this_month',   label: 'This Month'   },
      { value: 'this_quarter', label: 'This Quarter' },
      { value: 'upcoming',     label: 'Upcoming'     },
    ]},
  ].filter(Boolean)

  const handleCapture = async (title) => {
    await createProject(title)
    refresh()
    setActiveTab('inbox')
  }

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); setBulkStatus('') }

  const handleBulkMove = async () => {
    if (!bulkStatus || selectedIds.size === 0) return
    setBulkWorking(true)
    try {
      await Promise.all([...selectedIds].map(id => updateProject(id, { status: bulkStatus })))
      await refresh()
      exitSelectMode()
    } finally { setBulkWorking(false) }
  }

  const handleBulkDuplicate = async () => {
    if (selectedIds.size === 0) return
    setBulkWorking(true)
    try {
      for (const id of selectedIds) await duplicateProject(id)
      await refresh()
      exitSelectMode()
    } finally { setBulkWorking(false) }
  }

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return
    setBulkWorking(true)
    try {
      await Promise.all([...selectedIds].map(id => archiveProject(id)))
      await refresh()
      exitSelectMode()
    } finally { setBulkWorking(false) }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || !window.confirm(
      `Permanently delete ${selectedIds.size} project(s) AND all of their tasks? This cannot be undone.`
    )) return
    setBulkWorking(true)
    try {
      for (const id of selectedIds) await scrapeProject(id)
      await refresh()
      exitSelectMode()
    } finally { setBulkWorking(false) }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Projects Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={selectMode ? 'secondary' : 'ghost'} onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}>
            {selectMode ? `Cancel (${selectedIds.size} selected)` : 'Select'}
          </Button>
          <Button size="sm" variant="primary" onClick={() => setShowCapture(true)}>+ New Project</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Search */}
        <div className="px-6 pt-4 pb-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full px-4 py-2 rounded-xl text-sm border outline-none bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e  => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Tabs + Filter */}
        <div
          className="flex items-center gap-1 px-4 pb-2 overflow-x-auto shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex gap-1 flex-1 min-w-0 overflow-x-auto">
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
          <FilterControl groups={filterGroups} values={filters} onChange={handleFilterChange} className="shrink-0 ml-1" />
        </div>

        {/* Project list */}
        {loading ? (
          <EmptyState message="Loading…" />
        ) : displayed.length === 0 ? (
          <EmptyState
            message={search || hasActiveFilters ? 'No projects match your filters.' : `No ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()} projects.`}
            action={activeTab === 'inbox' && !search && !hasActiveFilters
              ? <Button size="sm" variant="secondary" onClick={() => setShowCapture(true)}>Capture something</Button>
              : undefined}
          />
        ) : (
          <div style={{ backgroundColor: 'var(--pane-bg)' }}>
            {displayed.map(project => (
              <ProjectRow
                key={project.id}
                project={project}
                onClick={() => !selectMode && navigate(`/projects/${project.id}`)}
                selectable={selectMode}
                selected={selectedIds.has(project.id)}
                onToggle={() => toggleSelect(project.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectMode && (
        <div
          className="shrink-0 flex items-center gap-3 px-6 py-3 border-t flex-wrap"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--pane-bg)' }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2 flex-1">
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              className="px-2 py-1.5 rounded-lg text-xs border outline-none bg-transparent"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="">Move to…</option>
              {TABS.filter(t => !['all', 'completed', 'archived'].includes(t.key)).map(t => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
            <Button size="sm" variant="primary" onClick={handleBulkMove} disabled={!bulkStatus || selectedIds.size === 0 || bulkWorking}>
              {bulkWorking ? '…' : 'Move'}
            </Button>
          </div>
          <Button size="sm" variant="secondary" onClick={handleBulkDuplicate} disabled={selectedIds.size === 0 || bulkWorking}>
            ⧉ Duplicate
          </Button>
          <Button size="sm" variant="secondary" onClick={handleBulkArchive} disabled={selectedIds.size === 0 || bulkWorking}>
            Archive
          </Button>
          <Button size="sm" variant="danger" onClick={handleBulkDelete} disabled={selectedIds.size === 0 || bulkWorking}>
            Delete
          </Button>
        </div>
      )}

      <CaptureProjectModal
        open={showCapture}
        onClose={() => setShowCapture(false)}
        onCreate={handleCapture}
      />
    </div>
  )
}
