import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trash2, Pencil } from 'lucide-react'
import {
  getTask, updateTask, completeTask, didIt,
  moveToNextAction, moveToQueued, moveToWaiting,
  clearWaiting, highlightTask, clarifyTask, getAllContextTags,
} from '../lib/api/tasks'
import { checkProjectStalled } from '../lib/api/projects'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { StatusPill, PriorityBadge, EnergyBadge } from '../components/ui'
import DurationInput from '../components/tasks/DurationInput'
import { formatDuration } from '../components/ui/DurationDisplay'
import WaitingModal from '../components/tasks/WaitingModal'
import HighlightModal from '../components/tasks/HighlightModal'
import RouteModal from '../components/tasks/RouteModal'
import TaskComments from '../components/tasks/TaskComments'
import TaskChecklist from '../components/tasks/TaskChecklist'
import { TASK_ACTIONS } from '../lib/constants'
import { useEnergyLevels } from '../contexts/EnergyLevelsContext'
import { usePriorities }   from '../contexts/PrioritiesContext'
import { useAreas }        from '../contexts/AreasContext'

const CLARIFY_REQUIRED = ['description', 'priority', 'duration', 'energy_level', 'area']
function isClarified(task) {
  return CLARIFY_REQUIRED.every(f => task[f] != null && task[f] !== '')
}

const inputCls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none bg-transparent'
const inputStyle = { borderColor: 'var(--border)', color: 'var(--text-primary)' }

function PencilBtn({ onClick, title = 'Edit' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center rounded-md transition-colors duration-150"
      style={{ width: 30, height: 30, backgroundColor: 'transparent', color: 'var(--text-secondary)' }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
    >
      <Pencil size={14} />
    </button>
  )
}

function TrashBtn({ onClick, title = 'Scrap it' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center rounded-md transition-colors duration-150"
      style={{ width: 30, height: 30, backgroundColor: 'var(--danger)', color: '#fff' }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--danger-hover)'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--danger)'}
    >
      <Trash2 size={14} />
    </button>
  )
}

function ReadField({ label, value, fallback = '—' }) {
  return (
    <div>
      <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="text-sm" style={{ color: value ? 'var(--text-primary)' : 'var(--text-dim)' }}>{value || fallback}</p>
    </div>
  )
}

export default function TaskPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { levels, levelMap }    = useEnergyLevels()
  const { priorities, priorityMap } = usePriorities()
  const { areas }               = useAreas()

  const [task,    setTask]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing,   setEditing]   = useState(false)
  const [draft,     setDraft]     = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState(null)

  const [showWaiting,   setShowWaiting]   = useState(false)
  const [showHighlight, setShowHighlight] = useState(false)
  const [showRoute,     setShowRoute]     = useState(false)
  const [showDidIt,     setShowDidIt]     = useState(false)
  const [showDiscard,   setShowDiscard]   = useState(false)
  const [allTags,       setAllTags]       = useState([])
  const [tagInput,      setTagInput]      = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await getTask(id)
      setTask(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])
  useEffect(() => { getAllContextTags().then(setAllTags).catch(() => {}) }, [id])

  const saveContext = async (context) => {
    setTask(prev => ({ ...prev, context }))
    await updateTask(id, { context })
    getAllContextTags().then(setAllTags).catch(() => {})
  }

  const addTag = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const tag = tagInput.trim().replace(/^@/, '')
      const current = task?.context ?? []
      if (!current.includes(tag)) saveContext([...current, tag])
      setTagInput('')
    }
  }

  const removeTag = (tag) => saveContext((task?.context ?? []).filter(t => t !== tag))
  const toggleTag = (tag) => {
    const current = task?.context ?? []
    current.includes(tag) ? removeTag(tag) : saveContext([...current, tag])
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
    </div>
  )

  if (!task) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: 'var(--danger)' }}>Task not found.</p>
    </div>
  )

  const clarified  = isClarified(task)
  const hasProject = !!task.project_id
  const isDone     = task.status === 'done'

  const startEdit  = () => { setDraft({ ...task }); setEditing(true) }
  const cancelEdit = () => { setDraft(null); setEditing(false) }
  const change     = (field, value) => setDraft(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updateTask(task.id, {
        title:        draft.title,
        description:  draft.description,
        priority:     draft.priority,
        duration:     draft.duration,
        energy_level: draft.energy_level,
        area:         draft.area,
        due_date:     draft.due_date || null,
        notes:        draft.notes,
      })
      setTask(prev => ({ ...prev, ...updated }))
      setEditing(false)
      setDraft(null)
    } catch (err) {
      console.error('Save failed:', err)
      setSaveError(err.message ?? 'Save failed — check console for details')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    await completeTask(task.id)
    if (task.project_id) await checkProjectStalled(task.project_id)
    setTask(prev => ({ ...prev, status: 'done' }))
    setShowHighlight(true)
  }

  const handleDidIt     = async () => { await didIt(task.id); navigate('/tasks') }
  const handleDiscard   = async () => { await didIt(task.id); navigate('/tasks') }

  const handleWaiting   = async (reason) => {
    await moveToWaiting(task.id, reason)
    setTask(prev => ({ ...prev, status: 'waiting' }))
  }

  const handleClearWaiting = async () => {
    await clearWaiting(task.id)
    setTask(prev => ({ ...prev, status: 'next_action' }))
  }

  const handleNextAction = async () => {
    await moveToNextAction(task.id)
    setTask(prev => ({ ...prev, status: 'next_action' }))
  }

  const handleQueue = async () => {
    await moveToQueued(task.id)
    setTask(prev => ({ ...prev, status: 'queued' }))
  }

  const handleSomeday = async () => {
    const updated = await updateTask(task.id, { status: 'someday' })
    setTask(prev => ({ ...prev, ...updated }))
  }

  const handleAssignProject = async (projectId) => {
    const updated = await updateTask(task.id, { project_id: projectId, status: 'queued' })
    setTask(prev => ({ ...prev, ...updated }))
  }

  const handleHighlight = async (note) => {
    await highlightTask(task.id, note)
    setTask(prev => ({ ...prev, is_highlight: true, highlight_note: note }))
  }

  const handleClarifyRoute = async () => {
    await clarifyTask(task.id, {
      description:  draft?.description  ?? task.description,
      priority:     draft?.priority     ?? task.priority,
      duration:     draft?.duration     ?? task.duration,
      energy_level: draft?.energy_level ?? task.energy_level,
      area:         draft?.area         ?? task.area,
    })
    await moveToNextAction(task.id)
    setTask(prev => ({ ...prev, status: 'next_action' }))
    setEditing(false)
    setDraft(null)
  }

  const d = editing ? draft : task

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Breadcrumb header */}
        <div
          className="flex items-center gap-3 px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => navigate('/tasks')}
            className="text-sm transition-opacity hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            ← Tasks
          </button>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span className="text-sm truncate flex-1" style={{ color: 'var(--text-primary)' }}>{task.title}</span>
          <StatusPill status={task.status} type="task" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Clarify banner */}
          {task.status === 'inbox' && !clarified && (
            <div
              className="rounded-lg px-4 py-3 border text-sm"
              style={{ backgroundColor: 'var(--state-warning-bg)', borderColor: 'var(--state-warning-text)', color: 'var(--state-warning-text)' }}
            >
              <p className="font-medium mb-1">📋 This task needs clarification</p>
              <p className="text-xs" style={{ color: 'var(--state-warning-dim)' }}>
                Missing: {CLARIFY_REQUIRED.filter(f => !task[f]).join(', ')}
              </p>
            </div>
          )}

          {/* Details section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Details</h2>
              {!editing ? (
                <PencilBtn onClick={startEdit} />
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
              <div className="rounded-lg px-3 py-2 mb-3 text-sm" style={{ backgroundColor: 'var(--state-error-bg)', borderColor: 'var(--danger)', border: '1px solid', color: 'var(--state-error-text)' }}>
                ⚠ {saveError}
              </div>
            )}

            <div
              className="rounded-xl border p-4 space-y-4"
              style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
            >
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
                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {task.is_highlight && <span className="mr-1">⭐</span>}
                  {task.title}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Priority */}
                {editing ? (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Priority</label>
                    <select value={d.priority ?? ''} onChange={e => change('priority', e.target.value)} className={inputCls} style={inputStyle}>
                      <option value="">Select…</option>
                      {priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Priority</p>
                    {task.priority ? <PriorityBadge priority={task.priority} /> : <span className="text-sm" style={{ color: 'var(--text-dim)' }}>—</span>}
                  </div>
                )}

                {/* Energy */}
                {editing ? (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Energy Level</label>
                    <select value={d.energy_level ?? ''} onChange={e => change('energy_level', e.target.value)} className={inputCls} style={inputStyle}>
                      <option value="">Select…</option>
                      {levels.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                  </div>
                ) : (
                  <ReadField label="Energy Level" value={levelMap[task.energy_level]?.label} />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Duration */}
                {editing ? (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Duration</label>
                    <DurationInput value={d.duration} onChange={v => change('duration', v)} />
                  </div>
                ) : (
                  <ReadField label="Duration" value={task.duration ? formatDuration(task.duration) : null} />
                )}

                {/* Area */}
                {editing ? (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Area</label>
                    <input
                      list="areas-list"
                      value={d.area ?? ''}
                      onChange={e => change('area', e.target.value)}
                      className={inputCls}
                      style={inputStyle}
                      placeholder="Select or type…"
                    />
                    <datalist id="areas-list">
                      {areas.map(a => <option key={a.id} value={a.value} />)}
                    </datalist>
                  </div>
                ) : (
                  <ReadField label="Area" value={task.area} />
                )}
              </div>

              {/* Description */}
              {editing ? (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
                  <textarea
                    value={d.description ?? ''}
                    onChange={e => change('description', e.target.value)}
                    rows={3}
                    className={`${inputCls} resize-none`}
                    style={inputStyle}
                    placeholder="What does this task involve?"
                  />
                </div>
              ) : (
                <ReadField label="Description" value={task.description} />
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Due date */}
                {editing ? (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Due Date</label>
                    <input
                      type="date"
                      value={d.due_date ?? ''}
                      onChange={e => change('due_date', e.target.value)}
                      className={inputCls}
                      style={inputStyle}
                    />
                  </div>
                ) : (
                  <ReadField
                    label="Due Date"
                    value={task.due_date
                      ? new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      : null}
                  />
                )}

                <ReadField label="Project" value={task.projects?.title} />
              </div>


              {/* Linked people */}
              {task.task_people?.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Linked People</p>
                  <div className="flex flex-wrap gap-2">
                    {task.task_people.map(tp => tp.people && (
                      <span key={tp.person_id} className="px-2 py-1 rounded-lg text-xs border" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                        👤 {tp.people.preferred_name ?? tp.people.first_name} {tp.people.last_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Context Tags section */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Context Tags</h2>
            <div className="rounded-xl border p-4 space-y-4" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>

              {/* Existing tags across all tasks */}
              {allTags.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Your tags</p>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => {
                      const active = task.context?.includes(tag)
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
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

              {/* Add new */}
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Add new</p>
                <div className="flex gap-2">
                  <input
                    list="tp-tag-suggestions"
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                    placeholder="Type a tag and press Enter…"
                    className={`${inputCls} flex-1`}
                    style={inputStyle}
                  />
                  <datalist id="tp-tag-suggestions">
                    {allTags.filter(t => !task.context?.includes(t)).map(t => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                  <button
                    onClick={() => {
                      if (tagInput.trim()) {
                        const tag = tagInput.trim().replace(/^@/, '')
                        const current = task?.context ?? []
                        if (!current.includes(tag)) saveContext([...current, tag])
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

              {/* Active tags */}
              {task.context?.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>On this task</p>
                  <div className="flex flex-wrap gap-1.5">
                    {task.context.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: 'var(--context-tag-bg)', color: 'var(--context-tag-text)' }}
                      >
                        @{tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-0.5 hover:opacity-70 leading-none"
                          aria-label={`Remove ${tag}`}
                        >×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </section>

          {/* Subtasks checklist */}
          <TaskChecklist
            taskId={task.id}
            subtasks={task.subtasks ?? []}
            onSubtasksChange={subtasks => setTask(prev => ({ ...prev, subtasks }))}
          />

          {/* Comments section */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Notes</h2>
            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
            >
              <TaskComments taskId={task.id} />
            </div>
          </section>

          {/* Action bar */}
          {!isDone && (
            <section className="pb-6">
              <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>What's Next?</h2>
              <div className="flex flex-wrap gap-2">
                {task.status === 'inbox' && (
                  <>
                    <Button variant="danger" size="sm" onClick={() => setShowDidIt(true)}>{TASK_ACTIONS.did_it}</Button>
                    {clarified && (
                      <>
                        {hasProject
                          ? <Button variant="success" size="sm" onClick={handleQueue}>{TASK_ACTIONS.queue}</Button>
                          : <>
                              <Button variant="success"   size="sm" onClick={handleClarifyRoute}>{TASK_ACTIONS.next_action}</Button>
                              <Button variant="secondary" size="sm" onClick={() => setShowRoute(true)}>Assign to Project →</Button>
                            </>
                        }
                      </>
                    )}
                    <span className="ml-auto"><TrashBtn onClick={() => setShowDiscard(true)} /></span>
                  </>
                )}
                {task.status === 'next_action' && (
                  <>
                    <Button variant="success"   size="sm" onClick={handleComplete}>{TASK_ACTIONS.complete}</Button>
                    <Button variant="danger"    size="sm" onClick={() => setShowWaiting(true)}>{TASK_ACTIONS.waiting}</Button>
                    {hasProject  && <Button variant="secondary" size="sm" onClick={handleQueue}>{TASK_ACTIONS.queue}</Button>}
                    {!hasProject && <Button variant="secondary" size="sm" onClick={() => setShowRoute(true)}>Assign to Project →</Button>}
                    <Button variant="ghost" size="sm" onClick={handleSomeday}>{TASK_ACTIONS.someday}</Button>
                  </>
                )}
                {task.status === 'queued' && (
                  <Button variant="success" size="sm" onClick={handleNextAction}>{TASK_ACTIONS.next_action}</Button>
                )}
                {task.status === 'waiting' && (
                  <Button variant="success" size="sm" onClick={handleClearWaiting}>Clear Blocker</Button>
                )}
                {task.status === 'scheduled' && (
                  <>
                    <Button variant="success"   size="sm" onClick={handleComplete}>{TASK_ACTIONS.complete}</Button>
                    <Button variant="secondary" size="sm" onClick={handleNextAction}>{TASK_ACTIONS.next_action}</Button>
                  </>
                )}
                {task.status === 'someday' && (
                  <>
                    <Button variant="success" size="sm" onClick={handleNextAction}>{TASK_ACTIONS.next_action}</Button>
                    <Button variant="ghost"   size="sm" onClick={() => setShowDiscard(true)}>{TASK_ACTIONS.discard}</Button>
                  </>
                )}
              </div>
            </section>
          )}

          {isDone && !task.is_highlight && (
            <section className="pb-6">
              <Button variant="secondary" size="sm" onClick={() => setShowHighlight(true)}>
                ⭐ Add to Highlights
              </Button>
            </section>
          )}
        </div>
      </div>

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
      <WaitingModal   open={showWaiting}   onClose={() => setShowWaiting(false)}   onConfirm={handleWaiting} />
      <HighlightModal open={showHighlight} onClose={() => setShowHighlight(false)} onConfirm={handleHighlight} />
      <RouteModal     open={showRoute}     onClose={() => setShowRoute(false)}     onAssign={handleAssignProject} />
    </>
  )
}
