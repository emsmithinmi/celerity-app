import { useState, useEffect } from 'react'
import {
  updateProject, startPlanning, startProject,
  completeProject, archiveProject, highlightProject,
} from '../../lib/api/projects'
import { supabase } from '../../lib/supabase'
import { useTasks } from '../../hooks/useTasks'

import Modal           from '../ui/Modal'
import Button          from '../ui/Button'
import ConfirmDialog   from '../ui/ConfirmDialog'
import { StatusPill, PriorityBadge } from '../ui'
import HighlightModal  from '../tasks/HighlightModal'
import ProjectComments from './ProjectComments'
import ProjectTaskList from './ProjectTaskList'
import { PROJECT_ACTIONS } from '../../lib/constants'
import { usePriorities } from '../../contexts/PrioritiesContext'
import { useAreas }      from '../../contexts/AreasContext'

// ─── Required fields for each gate ────────────────────────────────────────────
const PLAN_REQUIRED = ['area', 'description', 'start_date', 'end_date']

function isClarified(project) {
  return PLAN_REQUIRED.every(f => project[f] != null && project[f] !== '')
}

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls  = "w-full px-3 py-2 rounded-lg text-sm border outline-none bg-transparent"
const inputStyle = { borderColor: 'var(--border)', color: 'var(--text-primary)' }

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ProjectDetail({ project: initialProject, open, onClose, onRefresh }) {
  const { priorities } = usePriorities()
  const { areas }      = useAreas()
  const [project, setProject]         = useState(initialProject)
  const [tab,     setTab]             = useState('details')
  const [saving,  setSaving]          = useState(false)
  const [dirty,   setDirty]           = useState(false)
  const [taskCount, setTaskCount]     = useState(0)

  // Post-completion flow
  const [showHighlight, setShowHighlight] = useState(false)
  const [showArchive,   setShowArchive]   = useState(false)
  const [showDiscard,   setShowDiscard]   = useState(false)
  const [completing,    setCompleting]    = useState(false)

  // Fetch task count for the planning gate
  const { tasks } = useTasks({ project_id: project?.id })
  const totalTasks = tasks.length

  useEffect(() => { setProject(initialProject); setDirty(false) }, [initialProject])
  useEffect(() => { setTaskCount(totalTasks) }, [totalTasks])

  if (!project) return null

  const clarified  = isClarified(project)
  const canStart   = clarified && taskCount >= 2
  const isCompleted = project.status === 'completed'
  const isArchived  = !!project.archived_at

  const missing = PLAN_REQUIRED.filter(f => !project[f])

  // ── Field change ──
  const change = (field, value) => {
    setProject(prev => ({ ...prev, [field]: value }))
    setDirty(true)
  }

  // ── Save ──
  const handleSave = async () => {
    setSaving(true)
    const updated = await updateProject(project.id, {
      title:       project.title,
      area:        project.area,
      description: project.description,
      priority:    project.priority,
      start_date:  project.start_date  || null,
      end_date:    project.end_date    || null,
      waiting_for: project.waiting_for || null,
    })
    setProject(prev => ({ ...prev, ...updated }))
    setDirty(false)
    setSaving(false)
    onRefresh?.()
  }

  // ── Status transitions ──
  const handleStartPlanning = async () => {
    await startPlanning(project.id)
    setProject(prev => ({ ...prev, status: 'planning' }))
    onRefresh?.()
  }

  const handleStartProject = async () => {
    await startProject(project.id)
    setProject(prev => ({ ...prev, status: 'in_progress' }))
    onRefresh?.()
  }

  const handleComplete = async () => {
    setCompleting(true)
    await completeProject(project.id)
    setProject(prev => ({ ...prev, status: 'completed' }))
    setCompleting(false)
    onRefresh?.()
    setShowHighlight(true)
  }

  const handleHighlight = async (note) => {
    await highlightProject(project.id, note)
    setProject(prev => ({ ...prev, is_highlight: true, highlight_note: note }))
    onRefresh?.()
    setShowArchive(true)
  }

  const handleSkipHighlight = () => {
    setShowHighlight(false)
    setShowArchive(true)
  }

  const handleArchive = async () => {
    await archiveProject(project.id)
    setProject(prev => ({ ...prev, archived_at: new Date().toISOString() }))
    onRefresh?.()
    onClose()
  }

  const handleDiscard = async () => {
    // Hard delete — only from inbox/planning
    const { error } = await supabase.from('projects').delete().eq('id', project.id)
    if (!error) { onRefresh?.(); onClose() }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={() => { if (dirty) handleSave(); onClose() }}
        size="xl"
        title={null}
        footer={
          dirty ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setProject(initialProject); setDirty(false) }}>
                Discard changes
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </>
          ) : null
        }
      >
        {/* ── Title row ── */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={project.title}
              onChange={e => change('title', e.target.value)}
              className="w-full bg-transparent text-lg font-semibold outline-none border-b pb-1"
              style={{ color: 'var(--text-primary)', borderColor: dirty ? 'var(--accent)' : 'transparent' }}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            {project.is_highlight && <span title="Highlight">⭐</span>}
            {isArchived && <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--border)', color: 'var(--text-secondary)' }}>Archived</span>}
            <StatusPill status={project.status} type="project" />
          </div>
        </div>

        {/* ── Clarify banner (inbox only) ── */}
        {project.status === 'inbox' && !clarified && (
          <div
            className="rounded-lg px-4 py-3 mb-4 border text-sm"
            style={{ backgroundColor: 'var(--state-warning-bg)', borderColor: 'var(--state-warning-text)', color: 'var(--state-warning-text)' }}
          >
            <p className="font-medium mb-1">📋 Fill in required fields to start planning</p>
            <p className="text-xs" style={{ color: 'var(--state-warning-dim)' }}>Missing: {missing.join(', ')}</p>
          </div>
        )}

        {/* ── Planning gate banner ── */}
        {project.status === 'planning' && !canStart && (
          <div
            className="rounded-lg px-4 py-3 mb-4 border text-sm"
            style={{ backgroundColor: 'var(--state-info-bg)', borderColor: 'var(--accent)', color: 'var(--accent)' }}
          >
            <p className="font-medium">
              🗂 Add at least {Math.max(0, 2 - taskCount)} more task{2 - taskCount !== 1 ? 's' : ''} to start this project
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {taskCount} of 2 minimum tasks added
            </p>
          </div>
        )}

        {/* ── Stalled banner ── */}
        {project.status === 'stalled' && (
          <div
            className="rounded-lg px-4 py-3 mb-4 border text-sm"
            style={{ backgroundColor: 'var(--state-purple-bg)', borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }}
          >
            <p className="font-medium">⚠ Project is stalled</p>
            <p className="text-xs mt-1" style={{ color: 'var(--state-purple-dim)' }}>
              Move a task to Next Actions to un-stall this project.
            </p>
          </div>
        )}

        {/* ── Waiting banner ── */}
        {project.status === 'waiting' && (
          <div
            className="rounded-lg px-4 py-3 mb-4 border text-sm"
            style={{ backgroundColor: 'var(--state-error-bg)', borderColor: 'var(--danger)', color: 'var(--state-error-text)' }}
          >
            <p className="font-medium">⏳ Project is waiting on blocked tasks</p>
            <p className="text-xs mt-1" style={{ color: 'var(--state-error-dim)' }}>
              Clear blockers on waiting tasks to resume.
            </p>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-5 border-b" style={{ borderColor: 'var(--border)' }}>
          {['details', 'tasks', 'notes'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors"
              style={{
                borderColor: tab === t ? 'var(--accent)' : 'transparent',
                color:       tab === t ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {t}
              {t === 'tasks' && taskCount > 0 && (
                <span className="ml-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>({taskCount})</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Details tab ── */}
        {tab === 'details' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Priority">
                <select value={project.priority ?? ''} onChange={e => change('priority', e.target.value)}
                  className={inputCls} style={inputStyle}>
                  <option value="">Select…</option>
                  {priorities.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Area" required>
                <select value={project.area ?? ''} onChange={e => change('area', e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="">Select…</option>
                  {areas.map(a => <option key={a.id} value={a.label}>{a.label}</option>)}
                  {project.area && !areas.find(a => a.label === project.area) && <option value={project.area}>{project.area}</option>}
                </select>
              </FormField>
            </div>

            <FormField label="Description" required>
              <textarea value={project.description ?? ''}
                onChange={e => change('description', e.target.value)}
                placeholder="What is this project and what does done look like?"
                rows={3} className={`${inputCls} resize-none`} style={inputStyle} />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Start Date" required>
                <input type="date" value={project.start_date ?? ''}
                  onChange={e => change('start_date', e.target.value)}
                  className={inputCls} style={inputStyle} />
              </FormField>
              <FormField label="End Date" required>
                <input type="date" value={project.end_date ?? ''}
                  onChange={e => change('end_date', e.target.value)}
                  className={inputCls} style={inputStyle} />
              </FormField>
            </div>

            <FormField label="Waiting For">
              <input type="text" value={project.waiting_for ?? ''}
                onChange={e => change('waiting_for', e.target.value)}
                placeholder="What are you waiting on? (person, decision, resource)"
                className={inputCls} style={inputStyle} />
            </FormField>

            {/* Highlight note */}
            {project.is_highlight && project.highlight_note && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--highlight-note-bg)' }}>
                <span>⭐</span>
                <p className="text-sm" style={{ color: 'var(--accent-yellow)' }}>{project.highlight_note}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tasks tab ── */}
        {tab === 'tasks' && (
          <ProjectTaskList
            projectId={project.id}
            onTaskCountChange={() => setTaskCount(prev => prev + 1)}
          />
        )}

        {/* ── Comments tab ── */}
        {tab === 'notes' && <ProjectComments projectId={project.id} />}

        {/* ── Action buttons ── */}
        {!isCompleted && !isArchived && (
          <div className="mt-6 pt-5 border-t flex flex-wrap gap-2" style={{ borderColor: 'var(--border)' }}>

            {/* INBOX */}
            {project.status === 'inbox' && (
              <>
                <Button variant="primary"   size="sm" onClick={handleStartPlanning} disabled={!clarified}>
                  {PROJECT_ACTIONS.start_planning}
                </Button>
                <Button variant="ghost"     size="sm" onClick={() => setShowDiscard(true)}>
                  {PROJECT_ACTIONS.discard}
                </Button>
              </>
            )}

            {/* PLANNING */}
            {project.status === 'planning' && (
              <>
                <Button variant="success"   size="sm" onClick={handleStartProject} disabled={!canStart}
                  title={!canStart ? `Need ${Math.max(0, 2 - taskCount)} more task(s)` : undefined}>
                  {PROJECT_ACTIONS.start}
                </Button>
                <Button variant="secondary" size="sm" onClick={handleComplete}>
                  {PROJECT_ACTIONS.complete}
                </Button>
                <Button variant="ghost"     size="sm" onClick={() => setShowDiscard(true)}>
                  {PROJECT_ACTIONS.discard}
                </Button>
              </>
            )}

            {/* IN PROGRESS */}
            {project.status === 'in_progress' && (
              <Button variant="success" size="sm" onClick={handleComplete} disabled={completing}>
                {completing ? 'Completing…' : PROJECT_ACTIONS.complete}
              </Button>
            )}

            {/* STALLED — no direct action, handled by tasks */}
            {project.status === 'stalled' && (
              <Button variant="secondary" size="sm" onClick={() => setTab('tasks')}>
                View Tasks →
              </Button>
            )}

            {/* WAITING — no direct action */}
            {project.status === 'waiting' && (
              <Button variant="secondary" size="sm" onClick={() => setTab('tasks')}>
                View Blocked Tasks →
              </Button>
            )}
          </div>
        )}

        {/* COMPLETED actions */}
        {isCompleted && (
          <div className="mt-6 pt-5 border-t flex flex-wrap gap-2" style={{ borderColor: 'var(--border)' }}>
            {!project.is_highlight && (
              <Button variant="secondary" size="sm" onClick={() => setShowHighlight(true)}>
                ⭐ Add to Highlights
              </Button>
            )}
            {!isArchived && (
              <Button variant="ghost" size="sm" onClick={() => setShowArchive(true)}>
                Archive
              </Button>
            )}
          </div>
        )}
      </Modal>

      {/* ── Sub-modals ── */}
      <HighlightModal
        open={showHighlight}
        onClose={handleSkipHighlight}
        onConfirm={handleHighlight}
        title="Add Project to Highlights?"
      />
      <ConfirmDialog
        open={showArchive}
        onClose={() => { setShowArchive(false); onClose() }}
        onConfirm={handleArchive}
        title="Archive this project?"
        message="It will be hidden from all active views but remains searchable."
        confirmLabel="Archive"
        cancelLabel="Not yet"
        variant="secondary"
      />
      <ConfirmDialog
        open={showDiscard}
        onClose={() => setShowDiscard(false)}
        onConfirm={handleDiscard}
        title="Scrap this project?"
        message="This project will be permanently deleted."
        confirmLabel="Scrap It"
        variant="danger"
      />
    </>
  )
}
