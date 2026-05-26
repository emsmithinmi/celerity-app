import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import {
  getProject, updateProject, startPlanning, startProject,
  completeProject, archiveProject, highlightProject, scrapeProject,
} from '../lib/api/projects'
import { supabase } from '../lib/supabase'
import { useTasks } from '../hooks/useTasks'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { StatusPill, PriorityBadge } from '../components/ui'
import HighlightModal from '../components/tasks/HighlightModal'
import ProjectComments from '../components/projects/ProjectComments'
import ProjectTaskList from '../components/projects/ProjectTaskList'
import { PRIORITIES, PROJECT_ACTIONS } from '../lib/constants'

function TrashBtn({ onClick, title = 'Scrap it' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center rounded-md transition-colors duration-150"
      style={{ width: 30, height: 30, backgroundColor: '#DB4437', color: '#fff' }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#c53929'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#DB4437'}
    >
      <Trash2 size={14} />
    </button>
  )
}

const PLAN_REQUIRED = ['area', 'description', 'start_date', 'end_date']
function isClarified(project) {
  return PLAN_REQUIRED.every(f => project[f] != null && project[f] !== '')
}

const inputCls  = 'w-full px-3 py-2 rounded-lg text-sm border outline-none bg-transparent'
const inputStyle = { borderColor: '#313244', color: '#cdd6f4' }

function ReadField({ label, value, fallback = '—' }) {
  return (
    <div>
      <p className="text-xs font-medium mb-0.5" style={{ color: '#6c7086' }}>{label}</p>
      <p className="text-sm" style={{ color: value ? '#cdd6f4' : '#45475a' }}>{value || fallback}</p>
    </div>
  )
}

export default function ProjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [project,   setProject]   = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [editing,   setEditing]   = useState(false)
  const [draft,     setDraft]     = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState(null)
  const [completing, setCompleting] = useState(false)

  const [showHighlight, setShowHighlight] = useState(false)
  const [showArchive,   setShowArchive]   = useState(false)
  const [showDiscard,   setShowDiscard]   = useState(false)
  const [scrapping,     setScrapping]     = useState(false)

  const { tasks } = useTasks({ project_id: id })
  const taskCount = tasks.length

  const load = async () => {
    setLoading(true)
    try {
      const data = await getProject(id)
      setProject(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: '#6c7086' }}>Loading…</p>
    </div>
  )

  if (!project) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: '#DB4437' }}>Project not found.</p>
    </div>
  )

  const clarified   = isClarified(project)
  const canStart    = clarified && taskCount >= 2
  const isCompleted = project.status === 'completed'
  const isArchived  = !!project.archived_at

  const startEdit  = () => { setDraft({ ...project }); setEditing(true) }
  const cancelEdit = () => { setDraft(null); setEditing(false) }
  const change     = (field, value) => setDraft(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updateProject(project.id, {
        title:       draft.title,
        area:        draft.area,
        description: draft.description,
        priority:    draft.priority,
        start_date:  draft.start_date  || null,
        end_date:    draft.end_date    || null,
        waiting_for: draft.waiting_for || null,
      })
      setProject(prev => ({ ...prev, ...updated }))
      setEditing(false)
      setDraft(null)
    } catch (err) {
      console.error('Save failed:', err)
      setSaveError(err.message ?? 'Save failed — check console for details')
    } finally {
      setSaving(false)
    }
  }

  const handleStartPlanning = async () => {
    await startPlanning(project.id)
    setProject(prev => ({ ...prev, status: 'planning' }))
  }

  const handleStartProject = async () => {
    await startProject(project.id)
    setProject(prev => ({ ...prev, status: 'in_progress' }))
  }

  const handleComplete = async () => {
    setCompleting(true)
    await completeProject(project.id)
    setProject(prev => ({ ...prev, status: 'completed' }))
    setCompleting(false)
    setShowHighlight(true)
  }

  const handleHighlight = async (note) => {
    await highlightProject(project.id, note)
    setProject(prev => ({ ...prev, is_highlight: true, highlight_note: note }))
    setShowArchive(true)
  }

  const handleSkipHighlight = () => {
    setShowHighlight(false)
    setShowArchive(true)
  }

  const handleArchive = async () => {
    await archiveProject(project.id)
    navigate('/projects')
  }

  const handleDiscard = async () => {
    setScrapping(true)
    try {
      await scrapeProject(project.id)
      navigate('/projects')
    } finally {
      setScrapping(false)
    }
  }

  const d = editing ? draft : project

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Breadcrumb header */}
        <div
          className="flex items-center gap-3 px-6 py-4 border-b shrink-0"
          style={{ borderColor: '#313244' }}
        >
          <button
            onClick={() => navigate('/projects')}
            className="text-sm transition-opacity hover:opacity-80"
            style={{ color: '#6c7086' }}
          >
            ← Projects
          </button>
          <span style={{ color: '#313244' }}>/</span>
          <span className="text-sm truncate flex-1" style={{ color: '#cdd6f4' }}>{project.title}</span>
          <div className="flex items-center gap-2 shrink-0">
            {project.is_highlight && <span>⭐</span>}
            {isArchived && (
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#313244', color: '#6c7086' }}>
                Archived
              </span>
            )}
            <StatusPill status={project.status} type="project" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Status banners */}
          {project.status === 'inbox' && !clarified && (
            <div className="rounded-lg px-4 py-3 border text-sm" style={{ backgroundColor: '#2d2410', borderColor: '#FBBC05', color: '#FBBC05' }}>
              <p className="font-medium mb-1">📋 Fill in required fields to start planning</p>
              <p className="text-xs" style={{ color: '#e9c46a' }}>
                Missing: {PLAN_REQUIRED.filter(f => !project[f]).join(', ')}
              </p>
            </div>
          )}
          {project.status === 'planning' && !canStart && (
            <div className="rounded-lg px-4 py-3 border text-sm" style={{ backgroundColor: '#1e1e2d', borderColor: '#89b4fa', color: '#89b4fa' }}>
              <p className="font-medium">
                🗂 Add at least {Math.max(0, 2 - taskCount)} more task{2 - taskCount !== 1 ? 's' : ''} to start this project
              </p>
              <p className="text-xs mt-1" style={{ color: '#6c7086' }}>{taskCount} of 2 minimum tasks added</p>
            </div>
          )}
          {project.status === 'stalled' && (
            <div className="rounded-lg px-4 py-3 border text-sm" style={{ backgroundColor: '#2d1e10', borderColor: '#FB9039', color: '#FB9039' }}>
              <p className="font-medium">⚠ Project is stalled</p>
              <p className="text-xs mt-1" style={{ color: '#c97030' }}>Move a task to Next Actions to un-stall this project.</p>
            </div>
          )}
          {project.status === 'waiting' && (
            <div className="rounded-lg px-4 py-3 border text-sm" style={{ backgroundColor: '#2d1e1e', borderColor: '#DB4437', color: '#f28b82' }}>
              <p className="font-medium">⏳ Project is waiting on blocked tasks</p>
              <p className="text-xs mt-1" style={{ color: '#c07070' }}>Clear blockers on waiting tasks to resume.</p>
            </div>
          )}

          {/* Details section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold" style={{ color: '#cdd6f4' }}>Details</h2>
              {!editing ? (
                <Button variant="ghost" size="sm" onClick={startEdit}>Edit</Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              )}
            </div>

            {saveError && (
              <div className="rounded-lg px-3 py-2 mb-3 text-sm" style={{ backgroundColor: '#2d1e1e', border: '1px solid #DB4437', color: '#f28b82' }}>
                ⚠ {saveError}
              </div>
            )}

            <div className="rounded-xl border p-4 space-y-4" style={{ backgroundColor: '#181825', borderColor: '#313244' }}>
              {/* Title */}
              {editing ? (
                <input
                  type="text"
                  value={d.title}
                  onChange={e => change('title', e.target.value)}
                  className={`${inputCls} text-base font-semibold`}
                  style={inputStyle}
                />
              ) : (
                <p className="text-base font-semibold" style={{ color: '#cdd6f4' }}>{project.title}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Priority */}
                {editing ? (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Priority</label>
                    <select value={d.priority ?? ''} onChange={e => change('priority', e.target.value)} className={inputCls} style={inputStyle}>
                      <option value="">Select…</option>
                      {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Priority</p>
                    {project.priority ? <PriorityBadge priority={project.priority} /> : <span className="text-sm" style={{ color: '#45475a' }}>—</span>}
                  </div>
                )}

                {/* Area */}
                {editing ? (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Area</label>
                    <input type="text" value={d.area ?? ''} onChange={e => change('area', e.target.value)} className={inputCls} style={inputStyle} placeholder="e.g. Work, Personal" />
                  </div>
                ) : (
                  <ReadField label="Area" value={project.area} />
                )}
              </div>

              {/* Description */}
              {editing ? (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Description</label>
                  <textarea value={d.description ?? ''} onChange={e => change('description', e.target.value)} rows={3} className={`${inputCls} resize-none`} style={inputStyle} placeholder="What is this project and what does done look like?" />
                </div>
              ) : (
                <ReadField label="Description" value={project.description} />
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Start date */}
                {editing ? (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Start Date</label>
                    <input type="date" value={d.start_date ?? ''} onChange={e => change('start_date', e.target.value)} className={inputCls} style={inputStyle} />
                  </div>
                ) : (
                  <ReadField label="Start Date" value={project.start_date ? new Date(project.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null} />
                )}

                {/* End date */}
                {editing ? (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>End Date</label>
                    <input type="date" value={d.end_date ?? ''} onChange={e => change('end_date', e.target.value)} className={inputCls} style={inputStyle} />
                  </div>
                ) : (
                  <ReadField label="End Date" value={project.end_date ? new Date(project.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null} />
                )}
              </div>

              {/* Waiting for */}
              {editing ? (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Waiting For</label>
                  <input type="text" value={d.waiting_for ?? ''} onChange={e => change('waiting_for', e.target.value)} className={inputCls} style={inputStyle} placeholder="What are you waiting on?" />
                </div>
              ) : project.waiting_for ? (
                <ReadField label="Waiting For" value={project.waiting_for} />
              ) : null}

              {/* Highlight note */}
              {project.is_highlight && project.highlight_note && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#2d2a1e' }}>
                  <span>⭐</span>
                  <p className="text-sm" style={{ color: '#f9e2af' }}>{project.highlight_note}</p>
                </div>
              )}
            </div>
          </section>

          {/* Tasks section */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: '#cdd6f4' }}>
              Tasks {taskCount > 0 && <span className="text-sm font-normal" style={{ color: '#6c7086' }}>({taskCount})</span>}
            </h2>
            <div className="rounded-xl border p-4" style={{ backgroundColor: '#181825', borderColor: '#313244' }}>
              <ProjectTaskList projectId={project.id} onTaskCountChange={() => {}} />
            </div>
          </section>

          {/* Comments section */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: '#cdd6f4' }}>Comments</h2>
            <div className="rounded-xl border p-4" style={{ backgroundColor: '#181825', borderColor: '#313244' }}>
              <ProjectComments projectId={project.id} />
            </div>
          </section>

          {/* Action bar */}
          {!isCompleted && !isArchived && (
            <section className="pb-6">
              <h2 className="text-base font-semibold mb-3" style={{ color: '#cdd6f4' }}>What's Next?</h2>
              <div className="flex flex-wrap gap-2">
                {project.status === 'inbox' && (
                  <>
                    <Button variant="primary" size="sm" onClick={handleStartPlanning} disabled={!clarified}>
                      {PROJECT_ACTIONS.start_planning}
                    </Button>
                    <TrashBtn onClick={() => setShowDiscard(true)} />
                  </>
                )}
                {project.status === 'planning' && (
                  <>
                    <Button variant="success" size="sm" onClick={handleStartProject} disabled={!canStart} title={!canStart ? `Need ${Math.max(0, 2 - taskCount)} more task(s)` : undefined}>
                      {PROJECT_ACTIONS.start}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleComplete}>{PROJECT_ACTIONS.complete}</Button>
                    <TrashBtn onClick={() => setShowDiscard(true)} />
                  </>
                )}
                {project.status === 'in_progress' && (
                  <>
                    <Button variant="success" size="sm" onClick={handleComplete} disabled={completing}>
                      {completing ? 'Completing…' : PROJECT_ACTIONS.complete}
                    </Button>
                    <TrashBtn onClick={() => setShowDiscard(true)} />
                  </>
                )}
                {(project.status === 'stalled' || project.status === 'waiting') && (
                  <>
                    <p className="text-sm" style={{ color: '#6c7086' }}>
                      {project.status === 'stalled'
                        ? 'Move a task to Next Actions to un-stall this project.'
                        : 'Clear blockers on waiting tasks to resume.'}
                    </p>
                    <TrashBtn onClick={() => setShowDiscard(true)} />
                  </>
                )}
              </div>
            </section>
          )}

          {isCompleted && (
            <section className="pb-6">
              <div className="flex flex-wrap gap-2">
                {!project.is_highlight && (
                  <Button variant="secondary" size="sm" onClick={() => setShowHighlight(true)}>⭐ Add to Highlights</Button>
                )}
                {!isArchived && (
                  <Button variant="ghost" size="sm" onClick={() => setShowArchive(true)}>Archive</Button>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      <HighlightModal
        open={showHighlight}
        onClose={handleSkipHighlight}
        onConfirm={handleHighlight}
        title="Add Project to Highlights?"
      />
      <ConfirmDialog
        open={showArchive}
        onClose={() => setShowArchive(false)}
        onConfirm={handleArchive}
        title="Archive this project?"
        message="It will be hidden from all active views but remains searchable."
        confirmLabel="Archive"
        cancelLabel="Not yet"
        variant="secondary"
      />
      <ConfirmDialog
        open={showDiscard}
        onClose={() => { if (!scrapping) setShowDiscard(false) }}
        onConfirm={handleDiscard}
        title="Scrap this project?"
        message={`This permanently deletes the project and all ${taskCount} of its tasks. There is no undo.`}
        confirmLabel="Scrap It"
        variant="danger"
        loading={scrapping}
      />
    </>
  )
}
