import { useState, useEffect } from 'react'
import {
  updateTask, completeTask, didIt, moveToNextAction,
  moveToQueued, moveToWaiting, clearWaiting,
  highlightTask, clarifyTask, getAllContextTags,
} from '../../lib/api/tasks'
import { checkProjectStalled } from '../../lib/api/projects'

import Modal          from '../ui/Modal'
import Button         from '../ui/Button'
import ConfirmDialog  from '../ui/ConfirmDialog'
import { StatusPill, PriorityBadge, EnergyBadge, ContextTagList, TrashBtn } from '../ui'
import DurationInput  from './DurationInput'
import TaskComments   from './TaskComments'
import WaitingModal   from './WaitingModal'
import HighlightModal from './HighlightModal'
import RouteModal     from './RouteModal'
import { TASK_ACTIONS } from '../../lib/constants'
import { useEnergyLevels } from '../../contexts/EnergyLevelsContext'
import { usePriorities }   from '../../contexts/PrioritiesContext'
import { useAreas }        from '../../contexts/AreasContext'

// ─── Field helpers ────────────────────────────────────────────────────────────
const CLARIFY_REQUIRED = ['description', 'priority', 'duration', 'energy_level', 'area']

function isClarified(task) {
  return CLARIFY_REQUIRED.every(f => task[f] != null && task[f] !== '')
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

const inputCls = "w-full px-3 py-2 rounded-lg text-sm border outline-none bg-transparent"
const inputStyle = { borderColor: 'var(--border)', color: 'var(--text-primary)' }

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TaskDetail({ task: initialTask, open, onClose, onRefresh }) {
  const { levels, levelMap }        = useEnergyLevels()
  const { priorities, priorityMap } = usePriorities()
  const { areas }                   = useAreas()
  const [task,    setTask]    = useState(initialTask)
  const [tab,     setTab]     = useState('details')  // details | context | notes
  const [saving,  setSaving]  = useState(false)
  const [dirty,   setDirty]   = useState(false)

  // Sub-modal state
  const [showWaiting,   setShowWaiting]   = useState(false)
  const [showHighlight, setShowHighlight] = useState(false)
  const [showRoute,     setShowRoute]     = useState(false)
  const [showDidIt,     setShowDidIt]     = useState(false)
  const [showDiscard,   setShowDiscard]   = useState(false)
  const [tagInput,      setTagInput]      = useState('')
  const [allTags,       setAllTags]       = useState([])

  useEffect(() => { setTask(initialTask); setDirty(false) }, [initialTask])

  useEffect(() => {
    if (open) getAllContextTags().then(setAllTags).catch(() => {})
  }, [open])

  if (!task) return null

  const clarified  = isClarified(task)
  const hasProject = !!task.project_id
  const isDone     = task.status === 'done'

  // ── Field change ──
  const change = (field, value) => {
    setTask(prev => ({ ...prev, [field]: value }))
    setDirty(true)
  }

  // ── Save edits ──
  const handleSave = async () => {
    setSaving(true)
    const updated = await updateTask(task.id, {
      title:        task.title,
      description:  task.description,
      priority:     task.priority,
      duration:     task.duration,
      energy_level: task.energy_level,
      area:         task.area,
      due_date:     task.due_date || null,
      notes:        task.notes,
      context:      task.context,
    })
    setTask(prev => ({ ...prev, ...updated }))
    setDirty(false)
    setSaving(false)
    onRefresh?.()
  }

  // ── Actions ──
  const handleComplete = async () => {
    await completeTask(task.id)
    if (task.project_id) await checkProjectStalled(task.project_id)
    onRefresh?.()
    setShowHighlight(true)
  }

  const handleDidIt = async () => {
    await didIt(task.id)
    onRefresh?.()
    onClose()
  }

  const handleDiscard = async () => {
    await didIt(task.id) // same as hard delete
    onRefresh?.()
    onClose()
  }

  const handleWaiting = async (reason) => {
    await moveToWaiting(task.id, reason)
    setTask(prev => ({ ...prev, status: 'waiting' }))
    onRefresh?.()
  }

  const handleClearWaiting = async () => {
    await clearWaiting(task.id)
    setTask(prev => ({ ...prev, status: 'next_action' }))
    onRefresh?.()
  }

  const handleNextAction = async () => {
    await moveToNextAction(task.id)
    setTask(prev => ({ ...prev, status: 'next_action' }))
    onRefresh?.()
  }

  const handleQueue = async () => {
    await moveToQueued(task.id)
    setTask(prev => ({ ...prev, status: 'queued' }))
    onRefresh?.()
  }

  const handleSomeday = async () => {
    const updated = await updateTask(task.id, { status: 'someday' })
    setTask(prev => ({ ...prev, ...updated }))
    onRefresh?.()
  }

  const handleAssignProject = async (projectId) => {
    const updated = await updateTask(task.id, { project_id: projectId, status: 'queued' })
    setTask(prev => ({ ...prev, ...updated }))
    onRefresh?.()
  }

  const handleHighlight = async (note) => {
    await highlightTask(task.id, note)
    onRefresh?.()
    onClose()
  }

  const handleClarifyRoute = async () => {
    // Save required fields first, then move to next_action
    await clarifyTask(task.id, {
      description:  task.description,
      priority:     task.priority,
      duration:     task.duration,
      energy_level: task.energy_level,
      area:         task.area,
    })
    await moveToNextAction(task.id)
    setTask(prev => ({ ...prev, status: 'next_action' }))
    setDirty(false)
    onRefresh?.()
  }

  // ── Context tag input ──
  const addTag = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const tag = tagInput.trim().replace(/^@/, '')
      if (!task.context?.includes(tag)) {
        change('context', [...(task.context ?? []), tag])
      }
      setTagInput('')
    }
  }

  const removeTag = (tag) => {
    change('context', (task.context ?? []).filter(t => t !== tag))
  }

  // ── Missing clarify fields list ──
  const missing = CLARIFY_REQUIRED.filter(f => !task[f])

  return (
    <>
      <Modal
        open={open}
        onClose={() => { if (dirty) { handleSave() } onClose() }}
        size="lg"
        title={null}
        footer={
          dirty ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setTask(initialTask); setDirty(false) }}>
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
              value={task.title}
              onChange={e => change('title', e.target.value)}
              className="w-full bg-transparent text-lg font-semibold outline-none border-b pb-1"
              style={{ color: 'var(--text-primary)', borderColor: dirty ? 'var(--accent)' : 'transparent' }}
            />
          </div>
          <StatusPill status={task.status} type="task" className="shrink-0 mt-1" />
        </div>

        {/* ── Clarify banner ── */}
        {task.status === 'inbox' && !clarified && (
          <div
            className="rounded-lg px-4 py-3 mb-4 border text-sm"
            style={{ backgroundColor: 'var(--state-warning-bg)', borderColor: 'var(--state-warning-text)', color: 'var(--state-warning-text)' }}
          >
            <p className="font-medium mb-1">📋 This task needs clarification</p>
            <p className="text-xs" style={{ color: 'var(--state-warning-dim)' }}>
              Missing: {missing.join(', ')}
            </p>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-5 border-b" style={{ borderColor: 'var(--border)' }}>
          {['details', 'context', 'notes'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors"
              style={{
                borderColor: tab === t ? 'var(--accent)' : 'transparent',
                color: tab === t ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Details tab ── */}
        {tab === 'details' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <FormField label="Priority" required>
                <select
                  value={task.priority ?? ''}
                  onChange={e => change('priority', e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                >
                  <option value="">Select…</option>
                  {priorities.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </FormField>

              {/* Energy level */}
              <FormField label="Energy Level" required>
                <select
                  value={task.energy_level ?? ''}
                  onChange={e => change('energy_level', e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                >
                  <option value="">Select…</option>
                  {levels.map(e => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* Duration */}
            <FormField label="Duration" required>
              <DurationInput value={task.duration} onChange={v => change('duration', v)} />
            </FormField>

            {/* Area */}
            <FormField label="Area" required>
              <select value={task.area ?? ''} onChange={e => change('area', e.target.value)} className={inputCls} style={inputStyle}>
                <option value="">Select…</option>
                {areas.map(a => <option key={a.id} value={a.label}>{a.label}</option>)}
                {task.area && !areas.find(a => a.label === task.area) && <option value={task.area}>{task.area}</option>}
              </select>
            </FormField>

            {/* Description */}
            <FormField label="Description" required>
              <textarea
                value={task.description ?? ''}
                onChange={e => change('description', e.target.value)}
                placeholder="What does this task involve?"
                rows={3}
                className={`${inputCls} resize-none`}
                style={inputStyle}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              {/* Due date */}
              <FormField label="Due Date">
                <input
                  type="date"
                  value={task.due_date ?? ''}
                  onChange={e => change('due_date', e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </FormField>

              {/* Project (display only) */}
              <FormField label="Project">
                <div
                  className="px-3 py-2 rounded-lg text-sm border"
                  style={{ borderColor: 'var(--border)', color: task.projects ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                >
                  {task.projects?.title ?? 'Standalone task'}
                </div>
              </FormField>
            </div>

            {/* Notes */}
            <FormField label="Notes">
              <textarea
                value={task.notes ?? ''}
                onChange={e => change('notes', e.target.value)}
                placeholder="Additional notes…"
                rows={2}
                className={`${inputCls} resize-none`}
                style={inputStyle}
              />
            </FormField>

            {/* Linked people */}
            {task.task_people?.length > 0 && (
              <FormField label="Linked People">
                <div className="flex flex-wrap gap-2">
                  {task.task_people.map(tp => tp.people && (
                    <span
                      key={tp.person_id}
                      className="px-2 py-1 rounded-lg text-xs border"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    >
                      👤 {tp.people.preferred_name ?? tp.people.first_name} {tp.people.last_name}
                    </span>
                  ))}
                </div>
              </FormField>
            )}

            {/* Highlight badge */}
            {task.is_highlight && (
              <div className="flex items-center gap-2">
                <span>⭐</span>
                <span className="text-sm" style={{ color: 'var(--accent-yellow)' }}>Highlight</span>
                {task.highlight_note && (
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>— {task.highlight_note}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Context tab ── */}
        {tab === 'context' && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Tag this task with contexts like <span style={{ color: 'var(--accent)' }}>@phone</span>, <span style={{ color: 'var(--accent)' }}>@computer</span>, <span style={{ color: 'var(--accent)' }}>@errands</span>…
            </p>

            {/* Existing tag suggestions */}
            {allTags.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Your tags</p>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => {
                    const active = task.context?.includes(tag)
                    return (
                      <button
                        key={tag}
                        onClick={() => active ? removeTag(tag) : change('context', [...(task.context ?? []), tag])}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor: active ? 'var(--context-tag-active-bg)' : 'var(--border)',
                          color: active ? 'var(--context-tag-active-text)' : 'var(--text-primary)',
                        }}
                      >
                        @{tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Add new tag */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Add new</p>
              <div className="flex gap-2">
                <input
                  list="ctx-tag-suggestions"
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={addTag}
                  placeholder="Type a tag and press Enter…"
                  className={`${inputCls} flex-1`}
                  style={inputStyle}
                />
                <datalist id="ctx-tag-suggestions">
                  {allTags.filter(t => !task.context?.includes(t)).map(t => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                <button
                  onClick={() => {
                    if (tagInput.trim()) {
                      const tag = tagInput.trim().replace(/^@/, '')
                      if (!task.context?.includes(tag)) {
                        change('context', [...(task.context ?? []), tag])
                      }
                      setTagInput('')
                    }
                  }}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Active tags on this task */}
            {(task.context?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>On this task</p>
                <ContextTagList tags={task.context} onRemove={removeTag} />
              </div>
            )}
          </div>
        )}

        {/* ── Comments tab ── */}
        {tab === 'notes' && <TaskComments taskId={task.id} />}

        {/* ── Action buttons ── */}
        <div
          className="mt-6 pt-5 border-t flex flex-wrap gap-2 items-center"
          style={{ borderColor: 'var(--border)' }}
        >
          {/* INBOX actions */}
          {task.status === 'inbox' && (
            <>
              <Button variant="danger"  size="sm" onClick={() => setShowDidIt(true)}>
                {TASK_ACTIONS.did_it}
              </Button>
              {clarified && (
                <>
                  <Button variant="success" size="sm" onClick={handleClarifyRoute}>
                    {TASK_ACTIONS.next_action}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setShowRoute(true)}>
                    Assign to Project →
                  </Button>
                </>
              )}
            </>
          )}

          {/* NEXT ACTION actions */}
          {task.status === 'next_action' && (
            <>
              <Button variant="success"   size="sm" onClick={handleComplete}>
                {TASK_ACTIONS.complete}
              </Button>
              <Button variant="danger"    size="sm" onClick={() => setShowWaiting(true)}>
                {TASK_ACTIONS.waiting}
              </Button>
              {hasProject && (
                <Button variant="secondary" size="sm" onClick={handleQueue}>
                  {TASK_ACTIONS.queue}
                </Button>
              )}
              {!hasProject && (
                <Button variant="secondary" size="sm" onClick={() => setShowRoute(true)}>
                  Assign to Project →
                </Button>
              )}
              <Button variant="ghost"     size="sm" onClick={handleSomeday}>
                {TASK_ACTIONS.someday}
              </Button>
            </>
          )}

          {/* QUEUED actions */}
          {task.status === 'queued' && (
            <Button variant="success" size="sm" onClick={handleNextAction}>
              {TASK_ACTIONS.next_action}
            </Button>
          )}

          {/* WAITING actions */}
          {task.status === 'waiting' && (
            <Button variant="success" size="sm" onClick={handleClearWaiting}>
              Clear Blocker
            </Button>
          )}

          {/* SCHEDULED actions */}
          {task.status === 'scheduled' && (
            <>
              <Button variant="success"   size="sm" onClick={handleComplete}>
                {TASK_ACTIONS.complete}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleNextAction}>
                {TASK_ACTIONS.next_action}
              </Button>
            </>
          )}

          {/* SOMEDAY actions */}
          {task.status === 'someday' && (
            <Button variant="success" size="sm" onClick={handleNextAction}>
              {TASK_ACTIONS.next_action}
            </Button>
          )}

          {/* DONE actions */}
          {isDone && !task.is_highlight && (
            <Button variant="secondary" size="sm" onClick={() => setShowHighlight(true)}>
              ⭐ Add to Highlights
            </Button>
          )}

          <span className="ml-auto">
            <TrashBtn onClick={() => setShowDiscard(true)} title="Delete task" />
          </span>
        </div>
      </Modal>

      {/* Sub-modals */}
      <ConfirmDialog
        open={showDidIt}
        onClose={() => setShowDidIt(false)}
        onConfirm={handleDidIt}
        title="Did It!"
        message="This task will be permanently deleted — it was too quick to keep track of."
        confirmLabel="Yes, Did It"
        variant="danger"
      />
      <ConfirmDialog
        open={showDiscard}
        onClose={() => setShowDiscard(false)}
        onConfirm={handleDiscard}
        title="Scrap This?"
        message="This task will be permanently deleted."
        confirmLabel="Scrap It"
        variant="danger"
      />
      <WaitingModal
        open={showWaiting}
        onClose={() => setShowWaiting(false)}
        onConfirm={handleWaiting}
      />
      <HighlightModal
        open={showHighlight}
        onClose={() => setShowHighlight(false)}
        onConfirm={handleHighlight}
      />
      <RouteModal
        open={showRoute}
        onClose={() => setShowRoute(false)}
        onAssign={handleAssignProject}
      />
    </>
  )
}
