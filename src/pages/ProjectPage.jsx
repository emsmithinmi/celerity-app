import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getProject, updateProject, startPlanning, startProject,
  completeProject, archiveProject, highlightProject, scrapeProject,
  deferToSomeday, markSomedayReviewed,
} from '../lib/api/projects'
import { supabase } from '../lib/supabase'
import { useTasks } from '../hooks/useTasks'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { StatusPill, PriorityBadge, PencilBtn, TrashBtn, ProgressBar } from '../components/ui'
import { computeProgress, projectTasksToProgressItems, formatSeconds } from '../lib/progress'
import HighlightModal from '../components/tasks/HighlightModal'
import ProjectComments from '../components/projects/ProjectComments'
import ProjectTaskList from '../components/projects/ProjectTaskList'
import { PROJECT_ACTIONS } from '../lib/constants'
import { usePriorities } from '../contexts/PrioritiesContext'
import { useAreas }      from '../contexts/AreasContext'


const PLAN_REQUIRED = ['area', 'description', 'start_date', 'end_date']
function isClarified(project) {
  return PLAN_REQUIRED.every(f => project[f] != null && project[f] !== '')
}

const inputCls  = 'w-full px-3 py-2 rounded-lg text-sm border outline-none bg-transparent'
const inputStyle = { borderColor: 'var(--border)', color: 'var(--text-primary)' }

function ReadField({ label, value, fallback = '—' }) {
  return (
    <div>
      <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="text-sm" style={{ color: value ? 'var(--text-primary)' : 'var(--text-dim)' }}>{value || fallback}</p>
    </div>
  )
}

export default function ProjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { priorities } = usePriorities()
  const { areas }      = useAreas()

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

  useEffect(() => {
    if (project?.status === 'someday') {
      markSomedayReviewed(project.id)
      setProject(prev => ({ ...prev, reviewed_at: new Date().toISOString() }))
    }
  }, [project?.id, project?.status])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
    </div>
  )

  if (!project) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: 'var(--danger)' }}>Project not found.</p>
    </div>
  )

  const clarified   = isClarified(project)
  const canStart    = clarified && taskCount >= 2
  const isCompleted = project.status === 'completed'
  const isArchived  = !!project.archived_at
  const missing     = PLAN_REQUIRED.filter(f => !project[f])

  const somedayAge = (() => {
    if (project.status !== 'someday') return null
    const ref = project.reviewed_at || project.created_at
    if (!ref) return null
    const days = Math.floor((Date.now() - new Date(ref).getTime()) / 86_400_000)
    if (days === 0) return 'Reviewed today'
    if (days === 1) return 'Reviewed yesterday'
    return `Last reviewed ${days} days ago`
  })()

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

  const handleDefer = async () => {
    await deferToSomeday(project.id)
    setProject(prev => ({ ...prev, status: 'someday' }))
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

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Breadcrumb header */}
        <div
          className="flex items-center gap-3 px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => navigate('/projects')}
            className="text-sm transition-opacity hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            ← Projects
          </button>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span className="text-sm truncate flex-1" style={{ color: 'var(--text-primary)' }}>{project.title}</span>
          <div className="flex items-center gap-2 shrink-0">
            {project.is_highlight && <span>⭐</span>}
            {isArchived && (
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                Archived
              </span>
            )}
            <StatusPill status={project.status} type="project" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Status banners */}
          {project.status === 'inbox' && !clarified && (
            <div className="rounded-lg px-4 py-3 border text-sm" style={{ backgroundColor: 'var(--state-warning-bg)', borderColor: 'var(--state-warning-text)', color: 'var(--state-warning-text)' }}>
              <p className="font-medium mb-1">📋 Fill in required fields to start planning</p>
              <p className="text-xs" style={{ color: 'var(--state-warning-dim)' }}>
                Missing: {PLAN_REQUIRED.filter(f => !project[f]).join(', ')}
              </p>
            </div>
          )}
          {project.status === 'planning' && !canStart && (
            <div className="rounded-lg px-4 py-3 border text-sm" style={{ backgroundColor: 'var(--state-info-bg)', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
              <p className="font-medium">
                🗂 Add at least {Math.max(0, 2 - taskCount)} more task{2 - taskCount !== 1 ? 's' : ''} to start this project
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{taskCount} of 2 minimum tasks added</p>
            </div>
          )}
          {project.status === 'stalled' && (
            <div className="rounded-lg px-4 py-3 border text-sm" style={{ backgroundColor: 'var(--state-stalled-bg)', borderColor: 'var(--highlight)', color: 'var(--highlight)' }}>
              <p className="font-medium">⚠ Project is stalled</p>
              <p className="text-xs mt-1" style={{ color: 'var(--state-stalled-dim)' }}>Move a task to Next Actions to un-stall this project.</p>
            </div>
          )}
          {project.status === 'waiting' && (
            <div className="rounded-lg px-4 py-3 border text-sm" style={{ backgroundColor: 'var(--state-error-bg)', borderColor: 'var(--danger)', color: 'var(--state-error-text)' }}>
              <p className="font-medium">⏳ Project is waiting on blocked tasks</p>
              <p className="text-xs mt-1" style={{ color: 'var(--state-error-dim)' }}>Clear blockers on waiting tasks to resume.</p>
            </div>
          )}
          {project.status === 'someday' && (
            <div className="rounded-lg px-4 py-3 border text-sm" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>🔮 Someday/Maybe</p>
              <p className="text-xs mt-1">{somedayAge} — fill in area, dates &amp; description when you're ready to plan it.</p>
            </div>
          )}

          {/* Details section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Details</h2>
              <PencilBtn onClick={startEdit} />
            </div>

            <div className="rounded-xl border p-4 space-y-4" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
              <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{project.title}</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Priority</p>
                  {project.priority ? <PriorityBadge priority={project.priority} /> : <span className="text-sm" style={{ color: 'var(--text-dim)' }}>—</span>}
                </div>
                <ReadField label="Area" value={project.area} />
              </div>

              <ReadField label="Description" value={project.description} />

              <div className="grid grid-cols-2 gap-4">
                <ReadField label="Start Date" value={project.start_date ? new Date(project.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null} />
                <ReadField label="End Date" value={project.end_date ? new Date(project.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null} />
              </div>

              {project.waiting_for && <ReadField label="Waiting For" value={project.waiting_for} />}

              {project.is_highlight && project.highlight_note && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--highlight-note-bg)' }}>
                  <span>⭐</span>
                  <p className="text-sm" style={{ color: 'var(--accent-yellow)' }}>{project.highlight_note}</p>
                </div>
              )}
            </div>
          </section>

          {/* Tasks section */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Tasks {taskCount > 0 && <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>({taskCount})</span>}
            </h2>
            {taskCount > 0 && (() => {
              const progress = computeProgress(projectTasksToProgressItems(tasks))
              return (
                <div className="mb-3">
                  <ProgressBar fraction={progress.fraction} size="md" />
                  <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                    {progress.doneCount}/{progress.totalCount} tasks · {progress.percent}%
                    {progress.hasEstimates && (
                      <> · ~{formatSeconds(progress.remainingSeconds)} of work left · {formatSeconds(progress.totalSeconds)} total estimated</>
                    )}
                  </p>
                </div>
              )
            })()}
            <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
              <ProjectTaskList projectId={project.id} onTaskCountChange={() => {}} />
            </div>
          </section>

          {/* Comments section */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Notes</h2>
            <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
              <ProjectComments projectId={project.id} />
            </div>
          </section>

          {/* Action bar */}
          {!isCompleted && !isArchived && (
            <section className="pb-6">
              <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>What's Next?</h2>
              <div className="flex flex-wrap gap-2">
                {project.status === 'inbox' && (
                  <>
                    <Button variant="primary" size="sm" onClick={handleStartPlanning} disabled={!clarified}>
                      {PROJECT_ACTIONS.start_planning}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleDefer}>
                      {PROJECT_ACTIONS.someday}
                    </Button>
                    <span className="ml-auto"><TrashBtn onClick={() => setShowDiscard(true)} /></span>
                  </>
                )}
                {project.status === 'someday' && (
                  <>
                    <Button variant="primary" size="sm" onClick={handleStartPlanning} disabled={!clarified}
                      title={!clarified ? `Fill in: ${missing.join(', ')}` : undefined}>
                      {PROJECT_ACTIONS.start_planning}
                    </Button>
                    <span className="ml-auto"><TrashBtn onClick={() => setShowDiscard(true)} /></span>
                  </>
                )}
                {project.status === 'planning' && (
                  <>
                    <Button variant="success" size="sm" onClick={handleStartProject} disabled={!canStart} title={!canStart ? `Need ${Math.max(0, 2 - taskCount)} more task(s)` : undefined}>
                      {PROJECT_ACTIONS.start}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleComplete}>{PROJECT_ACTIONS.complete}</Button>
                    <span className="ml-auto"><TrashBtn onClick={() => setShowDiscard(true)} /></span>
                  </>
                )}
                {project.status === 'in_progress' && (
                  <>
                    <Button variant="success" size="sm" onClick={handleComplete} disabled={completing}>
                      {completing ? 'Completing…' : PROJECT_ACTIONS.complete}
                    </Button>
                    <span className="ml-auto"><TrashBtn onClick={() => setShowDiscard(true)} /></span>
                  </>
                )}
                {(project.status === 'stalled' || project.status === 'waiting') && (
                  <>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {project.status === 'stalled'
                        ? 'Move a task to Next Actions to un-stall this project.'
                        : 'Clear blockers on waiting tasks to resume.'}
                    </p>
                    <span className="ml-auto"><TrashBtn onClick={() => setShowDiscard(true)} /></span>
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

      {/* Details edit modal */}
      <Modal
        open={editing}
        onClose={cancelEdit}
        title="Edit Details"
        size="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        {saveError && (
          <div className="rounded-lg px-3 py-2 mb-3 text-sm" style={{ backgroundColor: 'var(--state-error-bg)', border: '1px solid var(--danger)', color: 'var(--state-error-text)' }}>
            ⚠ {saveError}
          </div>
        )}
        {editing && draft && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Title</label>
              <input
                type="text"
                value={draft.title}
                onChange={e => change('title', e.target.value)}
                className={`${inputCls} text-base font-semibold`}
                style={inputStyle}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Priority</label>
                <select value={draft.priority ?? ''} onChange={e => change('priority', e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="">Select…</option>
                  {priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Area</label>
                <select value={draft.area ?? ''} onChange={e => change('area', e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="">Select…</option>
                  {areas.map(a => <option key={a.id} value={a.label}>{a.label}</option>)}
                  {draft.area && !areas.find(a => a.label === draft.area) && <option value={draft.area}>{draft.area}</option>}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
              <textarea value={draft.description ?? ''} onChange={e => change('description', e.target.value)} rows={3} className={`${inputCls} resize-none`} style={inputStyle} placeholder="What is this project and what does done look like?" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Start Date</label>
                <input type="date" value={draft.start_date ?? ''} onChange={e => change('start_date', e.target.value)} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>End Date</label>
                <input type="date" value={draft.end_date ?? ''} onChange={e => change('end_date', e.target.value)} className={inputCls} style={inputStyle} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Waiting For</label>
              <input type="text" value={draft.waiting_for ?? ''} onChange={e => change('waiting_for', e.target.value)} className={inputCls} style={inputStyle} placeholder="What are you waiting on?" />
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
