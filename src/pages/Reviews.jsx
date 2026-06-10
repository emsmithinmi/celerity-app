import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Pencil, RotateCcw, Loader2, Check, CheckCheck, Zap, CalendarDays, Folder, Clock, Trash2, AlertCircle, X, ListPlus, Play } from 'lucide-react'
import { ensureReview, updateReviewContent, completeReview, updateSuggestions } from '../lib/api/reviews'
import { buildReflectContext, generateReflectQuestions, generateConversationalResponse, generateReflectPlan, writeReflectResults } from '../lib/ai/skills/reflectReview'
import { useAIConfig } from '../hooks/useAI'
import { useEnergyLevels } from '../contexts/EnergyLevelsContext'
import { usePriorities }   from '../contexts/PrioritiesContext'
import { useAreas }        from '../contexts/AreasContext'
import { createTask, updateTask, completeTaskWithOptions } from '../lib/api/tasks'
import { createProject, updateProject } from '../lib/api/projects'
import { createPerson, updatePerson } from '../lib/api/people'
import { supabase } from '../lib/supabase'
import {
  CaptureTaskModal,
  CaptureProjectModal,
  CapturePersonModal,
  QuickNoteModal,
} from '../components/daily/QuickCaptureModals'
import Button from '../components/ui/Button'
import ActionBtn from '../components/ui/ActionBtn'
import { EmptyState } from '../components/ui'
import TaskCompletionModal from '../components/tasks/TaskCompletionModal'
import { executeAction } from '../lib/ai/actions'

// ─── Shared styles ────────────────────────────────────────────────────────────

const S = {
  card:     { backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' },
  input:    { backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' },
  muted:    { color: 'var(--text-secondary)' },
  text:     { color: 'var(--text-primary)' },
  blue:     { color: 'var(--accent)' },
  green:    { color: 'var(--accent-green)' },
  red:      { color: 'var(--accent-red)' },
  yellow:   { color: 'var(--accent-yellow)' },
  purple:   { color: 'var(--accent-purple)' },
}

// ─── Section wrapper — locks downstream sections ──────────────────────────────

function SectionWrapper({ locked, lockLabel, children }) {
  return (
    <div
      style={{
        opacity: locked ? 0.38 : 1,
        pointerEvents: locked ? 'none' : 'auto',
        transition: 'opacity 0.35s ease',
        position: 'relative',
      }}
    >
      {locked && (
        <div
          className="absolute inset-0 flex items-start justify-center pt-10 z-10 rounded-2xl"
          style={{ pointerEvents: 'none' }}
        >
          <span
            className="text-xs font-medium px-3 py-1.5 rounded-full border"
            style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            🔒 {lockLabel}
          </span>
        </div>
      )}
      {children}
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ step, title, subtitle, done }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{
            backgroundColor: done ? 'var(--accent-green)' : 'var(--accent)',
            color: 'var(--app-bg)',
          }}
        >
          {done ? '✓' : step}
        </span>
        <h2 className="text-xl font-semibold" style={S.text}>{title}</h2>
        {done && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--state-success-bg)', color: 'var(--accent-green)', border: '1px solid var(--accent-green)33' }}>
            Done
          </span>
        )}
      </div>
      <div className="text-sm ml-7" style={S.muted}>{subtitle}</div>
    </div>
  )
}

// ─── Clarify task row ─────────────────────────────────────────────────────────

function ClarifyTaskRow({ task }) {
  const { levels }      = useEnergyLevels()
  const { priorities }  = usePriorities()
  const { areas }       = useAreas()

  const [resolved,        setResolved]        = useState(false)
  const [resolvedLabel,   setResolvedLabel]   = useState('')
  const [showCompletion,  setShowCompletion]  = useState(false)
  const [prompt,          setPrompt]          = useState(null)
  const [promptValue,     setPromptValue]     = useState('')
  const [projects,        setProjects]        = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [saving,          setSaving]          = useState(false)
  const [clarifyFields,   setClarifyFields]   = useState({
    description: task.description ?? '',
    priority:    task.priority    ?? '',
    energy_level:task.energy_level ?? '',
    duration:    task.duration    ?? '',
    area:        task.area        ?? '',
  })

  const rowRef = useRef(null)
  useEffect(() => {
    if (prompt === 'clarify') {
      setTimeout(() => rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80)
    }
  }, [prompt])

  const resolve = async (fn, label) => {
    setSaving(true)
    try { await fn() } finally { setSaving(false) }
    setResolvedLabel(label)
    setResolved(true)
  }

  const openPrompt = (type) => {
    setPromptValue('')
    setSelectedProject(null)
    if (type === 'route') {
      supabase.from('projects').select('id, title').in('status', ['planning', 'in_progress', 'stalled']).is('archived_at', null)
        .then(({ data }) => setProjects(data ?? []))
    }
    setPrompt(type)
  }

  const handleClarifyConfirm = () => {
    resolve(() => updateTask(task.id, {
      ...clarifyFields,
      duration: clarifyFields.duration ? Number(clarifyFields.duration) : null,
      status: 'next_action',
    }), 'Next Action')
    setPrompt(null)
  }
  const clarifyReady = clarifyFields.priority && clarifyFields.energy_level

  if (resolved) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border mb-1.5 opacity-40" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--accent-green)33' }}>
        <span className="flex-1 text-sm truncate line-through" style={{ color: 'var(--text-secondary)' }}>{task.title}</span>
        <span className="text-xs shrink-0" style={{ color: 'var(--accent-green)' }}>{resolvedLabel}</span>
      </div>
    )
  }

  const status = task.status

  return (
    <div ref={rowRef} className="rounded-lg border mb-1.5 overflow-hidden" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</span>
        {task.due_date && <span className="text-xs shrink-0" style={{ color: 'var(--accent-yellow)' }}>{task.due_date}</span>}
        <Link to={`/tasks/${task.id}`} className="text-xs shrink-0 hover:underline" style={{ color: 'var(--text-dim)' }}>open →</Link>
      </div>

      {prompt === 'schedule' && (
        <div className="px-3 pb-2.5 flex items-center gap-2">
          <input
            type="date" value={promptValue} onChange={e => setPromptValue(e.target.value)}
            autoFocus className="flex-1 px-2 py-1 rounded border text-xs outline-none"
            style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--accent)', color: 'var(--text-primary)' }}
          />
          <ActionBtn variant="warning" title="Confirm" disabled={!promptValue || saving} onClick={() => resolve(() => updateTask(task.id, { status: 'scheduled', due_date: promptValue }), 'Scheduled').then(() => setPrompt(null))}><Check size={13} /></ActionBtn>
          <ActionBtn variant="ghost" title="Cancel" onClick={() => setPrompt(null)}><X size={13} /></ActionBtn>
        </div>
      )}
      {prompt === 'waiting' && (
        <div className="px-3 pb-2.5 flex items-center gap-2">
          <input
            type="text" value={promptValue} onChange={e => setPromptValue(e.target.value)}
            placeholder="What's blocking this?" autoFocus
            className="flex-1 px-2 py-1 rounded border text-xs outline-none"
            style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--accent)', color: 'var(--text-primary)' }}
            onKeyDown={e => e.key === 'Enter' && promptValue.trim() && resolve(() => updateTask(task.id, { status: 'waiting', waiting_for: promptValue.trim() }), 'Waiting').then(() => setPrompt(null))}
          />
          <ActionBtn variant="danger" title="Confirm" disabled={!promptValue.trim() || saving} onClick={() => resolve(() => updateTask(task.id, { status: 'waiting', waiting_for: promptValue.trim() }), 'Waiting').then(() => setPrompt(null))}><Check size={13} /></ActionBtn>
          <ActionBtn variant="ghost" title="Cancel" onClick={() => setPrompt(null)}><X size={13} /></ActionBtn>
        </div>
      )}
      {prompt === 'clarify' && (
        <div
          className="px-3 pb-3 space-y-2 rounded-b-lg"
          style={{ backgroundColor: 'var(--card-task-bg)', borderTop: '1px solid var(--border)' }}
        >
          <p className="text-xs font-semibold pt-2" style={{ color: 'var(--accent)' }}>⚡ Put me in coach — fill in the details</p>
          <textarea
            autoFocus
            rows={2} placeholder="What does this task actually involve?"
            value={clarifyFields.description}
            onChange={e => setClarifyFields(f => ({ ...f, description: e.target.value }))}
            className="w-full px-2 py-1.5 rounded border text-xs outline-none resize-none"
            style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--accent)', color: 'var(--text-primary)' }}
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={clarifyFields.priority} onChange={e => setClarifyFields(f => ({ ...f, priority: e.target.value }))}
              className="px-2 py-1.5 rounded border text-xs outline-none"
              style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', color: clarifyFields.priority ? 'var(--text-primary)' : 'var(--text-dim)' }}>
              <option value="">Priority…</option>
              {priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select value={clarifyFields.energy_level} onChange={e => setClarifyFields(f => ({ ...f, energy_level: e.target.value }))}
              className="px-2 py-1.5 rounded border text-xs outline-none"
              style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', color: clarifyFields.energy_level ? 'var(--text-primary)' : 'var(--text-dim)' }}>
              <option value="">Energy…</option>
              {levels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <input type="number" min="1" placeholder="Duration (min)"
              value={clarifyFields.duration} onChange={e => setClarifyFields(f => ({ ...f, duration: e.target.value }))}
              className="px-2 py-1.5 rounded border text-xs outline-none"
              style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            <input list={`area-list-${task.id}`} placeholder="Area…"
              value={clarifyFields.area} onChange={e => setClarifyFields(f => ({ ...f, area: e.target.value }))}
              className="px-2 py-1.5 rounded border text-xs outline-none"
              style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            <datalist id={`area-list-${task.id}`}>{areas.map(a => <option key={a.id} value={a.label} />)}</datalist>
          </div>
          <div className="flex gap-2">
            <ActionBtn variant="primary" title="Send to Next Actions" disabled={!clarifyReady || saving} onClick={handleClarifyConfirm}><Check size={13} /></ActionBtn>
            <ActionBtn variant="ghost"   title="Cancel"               onClick={() => setPrompt(null)}><X size={13} /></ActionBtn>
          </div>
        </div>
      )}
      {prompt === 'route' && (
        <div className="px-3 pb-2.5 space-y-1.5">
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {projects.length === 0
              ? <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No active projects found.</p>
              : projects.map(p => (
                <button key={p.id} onClick={() => setSelectedProject(p.id)}
                  className="w-full text-left px-2 py-1.5 rounded border text-xs"
                  style={{ backgroundColor: selectedProject === p.id ? 'var(--border)' : 'transparent', borderColor: selectedProject === p.id ? 'var(--accent)' : 'var(--border)', color: 'var(--text-primary)' }}
                >{p.title}</button>
              ))
            }
          </div>
          <div className="flex gap-2">
            <ActionBtn variant="primary" title="Queue it" disabled={!selectedProject || saving} onClick={() => resolve(() => updateTask(task.id, { status: 'queued', project_id: selectedProject }), 'Queued').then(() => setPrompt(null))}><Check size={13} /></ActionBtn>
            <ActionBtn variant="ghost" title="Cancel" onClick={() => setPrompt(null)}><X size={13} /></ActionBtn>
          </div>
        </div>
      )}

      {!prompt && (
        <div className="px-3 pb-2.5 flex flex-wrap gap-1">
          {status === 'inbox' && !task.project_id && (
            <>
              <ActionBtn variant="danger"    title="Did It — mark done"        onClick={() => setShowCompletion(true)}><CheckCheck size={13} /></ActionBtn>
              <ActionBtn variant="success"   title="Next Action"                onClick={() => openPrompt('clarify')}><Zap size={13} /></ActionBtn>
              <ActionBtn variant="warning"   title="Schedule it"                onClick={() => openPrompt('schedule')}><CalendarDays size={13} /></ActionBtn>
              <ActionBtn variant="secondary" title="Assign to project"          onClick={() => openPrompt('route')}><Folder size={13} /></ActionBtn>
              <ActionBtn variant="ghost"     title="Someday/Maybe"              onClick={() => resolve(() => updateTask(task.id, { status: 'someday' }),     'Someday')}><Clock size={13} /></ActionBtn>
              <ActionBtn variant="ghost"     title="Scrap it"                   onClick={() => resolve(() => updateTask(task.id, { archived_at: new Date().toISOString() }), 'Scrapped')}><Trash2 size={13} /></ActionBtn>
            </>
          )}
          {status === 'inbox' && task.project_id && (
            <>
              <ActionBtn variant="danger"    title="Did It — mark done"        onClick={() => setShowCompletion(true)}><CheckCheck size={13} /></ActionBtn>
              <ActionBtn variant="secondary" title="Queue it"                  onClick={() => resolve(() => updateTask(task.id, { status: 'queued' }), 'Queued')}><ListPlus size={13} /></ActionBtn>
              <ActionBtn variant="warning"   title="Schedule it"               onClick={() => openPrompt('schedule')}><CalendarDays size={13} /></ActionBtn>
              <ActionBtn variant="ghost"     title="Someday/Maybe"             onClick={() => resolve(() => updateTask(task.id, { status: 'someday' }), 'Someday')}><Clock size={13} /></ActionBtn>
              <ActionBtn variant="ghost"     title="Scrap it"                  onClick={() => resolve(() => updateTask(task.id, { archived_at: new Date().toISOString() }), 'Scrapped')}><Trash2 size={13} /></ActionBtn>
            </>
          )}
          {status === 'next_action' && (
            <>
              <ActionBtn variant="danger"  title="Did It — mark done"    onClick={() => setShowCompletion(true)}><CheckCheck size={13} /></ActionBtn>
              <ActionBtn variant="warning" title="There's a holdup"      onClick={() => openPrompt('waiting')}><AlertCircle size={13} /></ActionBtn>
              <ActionBtn variant="warning" title="Schedule it"           onClick={() => openPrompt('schedule')}><CalendarDays size={13} /></ActionBtn>
              <ActionBtn variant="ghost"   title="Scrap it"              onClick={() => resolve(() => updateTask(task.id, { archived_at: new Date().toISOString() }), 'Scrapped')}><Trash2 size={13} /></ActionBtn>
            </>
          )}
          {status === 'queued' && (
            <>
              <ActionBtn variant="danger"   title="Did It — mark done"   onClick={() => setShowCompletion(true)}><CheckCheck size={13} /></ActionBtn>
              <ActionBtn variant="success"  title="Move to next action"  onClick={() => resolve(() => updateTask(task.id, { status: 'next_action' }), 'Next Action')}><Zap size={13} /></ActionBtn>
            </>
          )}
          {status === 'waiting' && (
            <>
              <ActionBtn variant="danger"   title="Did It — mark done"   onClick={() => setShowCompletion(true)}><CheckCheck size={13} /></ActionBtn>
              <ActionBtn variant="success"  title="Clear blocker"        onClick={() => resolve(() => updateTask(task.id, { status: 'next_action', waiting_for: null }), 'Unblocked')}><Play size={13} /></ActionBtn>
            </>
          )}
          {status === 'scheduled' && (
            <>
              <ActionBtn variant="danger"   title="Did It — mark done"    onClick={() => setShowCompletion(true)}><CheckCheck size={13} /></ActionBtn>
              <ActionBtn variant="success"  title="Move to next action"   onClick={() => resolve(() => updateTask(task.id, { status: 'next_action' }), 'Next Action')}><Zap size={13} /></ActionBtn>
            </>
          )}
          {status === 'someday' && (
            <>
              <ActionBtn variant="success" title="Move to next action"  onClick={() => resolve(() => updateTask(task.id, { status: 'next_action' }), 'Next Action')}><Zap size={13} /></ActionBtn>
              <ActionBtn variant="ghost"   title="Scrap it"             onClick={() => resolve(() => updateTask(task.id, { archived_at: new Date().toISOString() }), 'Scrapped')}><Trash2 size={13} /></ActionBtn>
            </>
          )}
        </div>
      )}

      <TaskCompletionModal
        open={showCompletion}
        onClose={() => setShowCompletion(false)}
        onConfirm={async (opts) => {
          await resolve(
            () => completeTaskWithOptions(task.id, opts),
            opts.archive ? 'Archived' : opts.highlight ? 'Highlighted ⭐' : 'Done'
          )
          setShowCompletion(false)
        }}
      />
    </div>
  )
}

// ─── Clarify row (projects / people) ─────────────────────────────────────────

function ClarifyRow({ item, linkTo, onDone, onScrap, meta }) {
  const [state, setState] = useState('pending')

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg border mb-1.5 transition-all"
      style={{
        backgroundColor: 'var(--app-bg)',
        borderColor: state === 'done' ? 'var(--accent-green)33' : state === 'scrapped' ? 'var(--accent-red)33' : 'var(--border)',
        opacity: state !== 'pending' ? 0.45 : 1,
      }}
    >
      <Link
        to={linkTo}
        className="flex-1 text-sm truncate hover:underline"
        style={{ color: state !== 'pending' ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: state !== 'pending' ? 'line-through' : 'none' }}
      >
        {item.title ?? `${item.first_name} ${item.last_name}`}
      </Link>
      {meta && <span className="text-xs shrink-0" style={S.muted}>{meta}</span>}
      {state === 'pending' && (
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={async () => { setState('done'); await onDone(item) }}
            title="Done"
            className="w-7 h-7 rounded-md flex items-center justify-center text-sm transition-colors"
            style={{ backgroundColor: 'var(--state-success-bg)', color: 'var(--accent-green)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--accent-green)'; e.currentTarget.style.color = 'var(--app-bg)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--state-success-bg)'; e.currentTarget.style.color = 'var(--accent-green)' }}
          >✓</button>
          <button
            onClick={async () => { setState('scrapped'); await onScrap(item) }}
            title="Scrap"
            className="w-7 h-7 rounded-md flex items-center justify-center text-sm transition-colors"
            style={{ backgroundColor: 'var(--state-error-bg)', color: 'var(--accent-red)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--accent-red)'; e.currentTarget.style.color = 'var(--app-bg)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--state-error-bg)'; e.currentTarget.style.color = 'var(--accent-red)' }}
          >🗑</button>
        </div>
      )}
    </div>
  )
}

// ─── Suggestion card ──────────────────────────────────────────────────────────

const ACTION_LABELS = {
  update_task:           '✏️ Update task',
  create_task:           '✅ Create task',
  update_project:        '📁 Update project',
  archive_email:         '📨 Archive email',
  trash_email:           '🗑 Delete email',
  create_calendar_event: '📅 Add to calendar',
  update_calendar_event: '📅 Edit event',
  delete_calendar_event: '📅 Remove event',
}

function SuggestionCard({ suggestion, onAccept, onSkip, onEdit }) {
  const [editing,  setEditing]  = useState(false)
  const [edited,   setEdited]   = useState(suggestion.content)
  const [running,  setRunning]  = useState(false)
  const [runError, setRunError] = useState(null)

  const TYPE_COLORS = {
    task_update:    { bg: 'var(--card-task-bg)',     border: 'var(--accent)',        text: 'var(--accent)'        },
    project_update: { bg: 'var(--card-project-bg)',  border: 'var(--accent-purple)', text: 'var(--accent-purple)' },
    new_task:       { bg: 'var(--state-success-bg)', border: 'var(--accent-green)',  text: 'var(--accent-green)'  },
    archive_email:  { bg: 'var(--card-reminder-bg)', border: 'var(--accent-yellow)', text: 'var(--accent-yellow)' },
    calendar_add:   { bg: 'var(--card-insight-bg)',  border: 'var(--accent-pink)',   text: 'var(--accent-pink)'   },
    calendar_edit:  { bg: 'var(--card-insight-bg)',  border: 'var(--accent-pink)',   text: 'var(--accent-pink)'   },
    calendar_delete:{ bg: 'var(--state-error-bg)',   border: 'var(--accent-red)',    text: 'var(--accent-red)'    },
    reminder:       { bg: 'var(--card-reminder-bg)', border: 'var(--accent-orange)', text: 'var(--accent-orange)' },
    insight:        { bg: 'var(--card-insight-bg)',  border: 'var(--accent-pink)',   text: 'var(--accent-pink)'   },
  }
  const colors = TYPE_COLORS[suggestion.type] ?? TYPE_COLORS.insight
  if (suggestion.status === 'skipped') return null

  const hasAction = !!suggestion.action

  const handleAccept = async () => {
    if (hasAction) {
      setRunning(true)
      setRunError(null)
      try {
        await executeAction(suggestion.action)
      } catch (err) {
        setRunError(err.message ?? 'Action failed')
        setRunning(false)
        return
      }
      setRunning(false)
    }
    onAccept()
  }

  return (
    <div className="rounded-lg border p-4 space-y-3" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
      <div className="flex items-start gap-2">
        <span
          className="text-xs px-2 py-0.5 rounded shrink-0 mt-0.5"
          style={{ backgroundColor: colors.border + '33', color: colors.text, border: `1px solid ${colors.border}` }}
        >
          {suggestion.type?.replace(/_/g, ' ') ?? 'suggestion'}
        </span>
        {editing ? (
          <textarea
            value={edited}
            onChange={e => setEdited(e.target.value)}
            rows={3}
            autoFocus
            className="flex-1 px-2 py-1 rounded text-sm border outline-none resize-none"
            style={S.input}
          />
        ) : (
          <p className="text-sm flex-1" style={S.text}>{suggestion.content}</p>
        )}
      </div>

      {/* Action badge — shows what will happen on accept */}
      {hasAction && suggestion.status !== 'accepted' && (
        <div
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg"
          style={{ backgroundColor: colors.border + '22', color: colors.text }}
        >
          <span className="font-medium">{ACTION_LABELS[suggestion.action.type] ?? suggestion.action.type}</span>
          <span style={{ opacity: 0.7 }}>— will execute on accept</span>
        </div>
      )}

      {runError && (
        <p className="text-xs" style={S.red}>⚠ {runError}</p>
      )}

      <div className="flex gap-2 items-center">
        {editing ? (
          <>
            <Button size="sm" variant="success" onClick={() => { onEdit(edited); setEditing(false) }}>Accept Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </>
        ) : (
          <>
            {suggestion.status !== 'accepted' && (
              <button
                onClick={handleAccept}
                disabled={running}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ backgroundColor: 'var(--accent-green)', color: 'var(--app-bg)', opacity: running ? 0.6 : 1 }}
              >
                {running
                  ? <><Loader2 size={12} className="animate-spin" /> Running…</>
                  : '✓ Accept'
                }
              </button>
            )}
            {suggestion.status !== 'accepted' && !running && (
              <button
                onClick={() => setEditing(true)}
                title="Edit"
                className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                <Pencil size={13} />
              </button>
            )}
            {!running && suggestion.status !== 'accepted' && <Button size="sm" variant="ghost" onClick={onSkip}>✕ Skip</Button>}
            {suggestion.status === 'accepted' && (
              <span className="text-xs self-center" style={S.green}>✓ Done</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Chat bubble ──────────────────────────────────────────────────────────────

function Bubble({ role, children }) {
  const isAI = role === 'ai'
  const isSystem = role === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div
          className="px-3 py-1.5 text-xs rounded-full"
          style={{ backgroundColor: 'var(--success-bg, #16a34a22)', color: 'var(--success, #4ade80)', border: '1px solid var(--success-border, #4ade8044)' }}
          dangerouslySetInnerHTML={{ __html: children }}
        />
      </div>
    )
  }

  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
      <div
        className="max-w-[82%] px-4 py-3 text-sm leading-relaxed"
        style={{
          backgroundColor: isAI ? 'var(--border)' : 'var(--accent)',
          color: isAI ? 'var(--text-primary)' : 'var(--app-bg)',
          borderRadius: isAI ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
          fontWeight: isAI ? 400 : 500,
        }}
        dangerouslySetInnerHTML={{ __html: children }}
      />
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm" style={{ backgroundColor: 'var(--border)' }}>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: 'var(--text-secondary)',
                display: 'inline-block',
                animation: `bounce 1.2s ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Reference card (collapsible) ────────────────────────────────────────────

function RefCard({ title, count, children }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-xl border mb-3 overflow-hidden" style={S.card}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold transition-colors"
        style={{ color: 'var(--text-secondary)', background: 'transparent' }}
      >
        <span>
          {title}
          {count != null && (
            <span className="ml-2 px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--border)', color: 'var(--accent)' }}>{count}</span>
          )}
        </span>
        <span style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>▾</span>
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  )
}

// ─── SECTION 1: CAPTURE ───────────────────────────────────────────────────────

function CaptureSection({ onDone, done, todayNoteId, onCapture }) {
  const [modal,    setModal]    = useState(null)
  const [captured, setCaptured] = useState([])

  const addCaptured = (type, title) => { setCaptured(prev => [...prev, { type, title }]); onCapture?.() }

  const handleCreateTask    = async (title)                  => { await createTask({ title, status: 'inbox' }); addCaptured('task', title) }
  const handleCreateProject = async (title)                  => { await createProject({ title }); addCaptured('project', title) }
  const handleCreatePerson  = async ({ first_name, last_name }) => { await createPerson({ first_name, last_name }); addCaptured('person', `${first_name} ${last_name}`) }
  const handleAddNote       = async (body)                   => {
    if (todayNoteId) {
      await supabase.rpc('append_daily_note', { note_id: todayNoteId, body }).catch(() => {
        supabase.from('daily_notes').select('notes').eq('id', todayNoteId).single().then(({ data }) => {
          const notes = data?.notes ?? []
          supabase.from('daily_notes').update({ notes: [...notes, { id: crypto.randomUUID(), body, created_at: new Date().toISOString() }] }).eq('id', todayNoteId)
        })
      })
    }
    addCaptured('note', body.slice(0, 60))
  }

  const icons = { task: '✅', project: '📁', note: '📝', person: '👤' }

  return (
    <div className="rounded-2xl border p-6 mb-4" style={S.card}>
      <SectionHeader
        step={1}
        title="Capture"
        subtitle="Get everything out of your head. Don't filter, don't organize — just capture."
        done={done}
      />

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { type: 'task',    icon: '✅', label: 'Task',    sub: 'Something to do'       },
          { type: 'project', icon: '📁', label: 'Project', sub: 'Multi-step outcome'    },
          { type: 'note',    icon: '📝', label: 'Note',    sub: 'Something to remember' },
          { type: 'person',  icon: '👤', label: 'Person',  sub: 'Someone to track'      },
        ].map(({ type, icon, label, sub }) => (
          <button
            key={type}
            onClick={() => setModal(type)}
            className="rounded-xl border p-4 text-left transition-all"
            style={{ backgroundColor: 'var(--border)', borderColor: 'var(--text-dim)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--text-dim)' }}
          >
            <div className="text-xl mb-1">{icon}</div>
            <div className="text-sm font-medium" style={S.text}>{label}</div>
            <div className="text-xs mt-0.5" style={S.muted}>{sub}</div>
          </button>
        ))}
      </div>

      {captured.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {captured.map((item, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: 'var(--state-success-bg)', borderColor: 'var(--accent-green)33', color: 'var(--accent-green)' }}>
              <span>{icons[item.type]}</span>
              <span className="flex-1 truncate">{item.title}</span>
              <span className="text-xs uppercase" style={S.muted}>{item.type}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <span className="text-sm" style={S.muted}>
          {captured.length > 0 ? `${captured.length} item${captured.length !== 1 ? 's' : ''} captured this session` : 'Nothing yet — what\'s rattling around up there?'}
        </span>
        {done
          ? <span className="text-sm" style={S.muted}>✓ Capture locked in — keep adding above anytime</span>
          : <Button variant="primary" onClick={onDone}>Done Capturing →</Button>
        }
      </div>

      <CaptureTaskModal    open={modal === 'task'}    onClose={() => setModal(null)} onCreate={handleCreateTask}    />
      <CaptureProjectModal open={modal === 'project'} onClose={() => setModal(null)} onCreate={handleCreateProject} />
      <CapturePersonModal  open={modal === 'person'}  onClose={() => setModal(null)} onCreate={handleCreatePerson}  />
      <QuickNoteModal      open={modal === 'note'}    onClose={() => setModal(null)} onAdd={handleAddNote}          />
    </div>
  )
}

// ─── SECTION 2: CLARIFY ───────────────────────────────────────────────────────

function ClarifySection({ onDone, done, captureVersion }) {
  const today = new Date().toLocaleDateString('en-CA')
  const [inboxTasks,    setInboxTasks]    = useState([])
  const [inboxProjects, setInboxProjects] = useState([])
  const [inboxPeople,   setInboxPeople]   = useState([])
  const [stalled,       setStalled]       = useState([])
  const [overdue,       setOverdue]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [activeTab,     setActiveTab]     = useState('all')

  useEffect(() => {
    async function load() {
      try {
        const [tasksRes, projectsRes, peopleRes, activeTasksRes] = await Promise.all([
          supabase.from('tasks').select('id, title, status, due_date, project_id').eq('status', 'inbox').is('archived_at', null).order('created_at', { ascending: false }),
          supabase.from('projects').select('id, title').eq('status', 'inbox').is('archived_at', null).order('created_at', { ascending: false }),
          supabase.from('people').select('id, first_name, last_name').eq('status', 'inbox').order('last_name', { ascending: true }),
          supabase.from('tasks').select('id, project_id').in('status', ['next_action', 'waiting', 'scheduled', 'queued']).is('archived_at', null),
        ])
        const activeProjectIds = new Set((activeTasksRes.data ?? []).filter(t => t.project_id).map(t => t.project_id))
        const [stalledRes, overdueRes] = await Promise.all([
          supabase.from('projects').select('id, title').eq('status', 'in_progress').is('archived_at', null),
          supabase.from('tasks').select('id, title, status, due_date, project_id').in('status', ['next_action', 'waiting', 'scheduled', 'queued']).lt('due_date', today).is('archived_at', null).order('due_date', { ascending: true }),
        ])
        setInboxTasks(tasksRes.data ?? [])
        setInboxProjects(projectsRes.data ?? [])
        setInboxPeople(peopleRes.data ?? [])
        setStalled((stalledRes.data ?? []).filter(p => !activeProjectIds.has(p.id)))
        setOverdue(overdueRes.data ?? [])
      } catch (err) {
        console.error('ClarifySection load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [today, captureVersion])

  const daysDiff = (dateStr) => {
    const diff = Math.floor((new Date(today) - new Date(dateStr)) / 86400000)
    return diff === 1 ? '1d overdue' : `${diff}d overdue`
  }

  const allEmpty = !inboxTasks.length && !inboxProjects.length && !inboxPeople.length && !stalled.length && !overdue.length

  return (
    <div className="rounded-2xl border p-6 mb-4" style={S.card}>
      <SectionHeader
        step={2}
        title="Clarify"
        subtitle="Process what's in your inbox. Mark done when sorted, scrap if it's noise."
        done={done}
      />

      {/* Tab bar */}
      {!loading && !allEmpty && (() => {
        const tabs = [
          { key: 'all',      label: 'All',      count: inboxTasks.length + inboxProjects.length + inboxPeople.length + stalled.length + overdue.length },
          { key: 'tasks',    label: 'Tasks',    count: inboxTasks.length    },
          { key: 'projects', label: 'Projects', count: inboxProjects.length },
          { key: 'people',   label: 'People',   count: inboxPeople.length   },
          { key: 'stalled',  label: 'Stalled',  count: stalled.length       },
          { key: 'overdue',  label: 'Overdue',  count: overdue.length       },
        ].filter(t => t.key === 'all' || t.count > 0)
        return (
          <div className="flex gap-1 mb-4 flex-wrap">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: activeTab === t.key ? 'var(--border)' : 'transparent',
                  color:           activeTab === t.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                {t.label}
                {t.count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none" style={{
                    backgroundColor: activeTab === t.key ? 'var(--text-secondary)' : 'var(--border)',
                    color:           activeTab === t.key ? 'var(--pane-bg)'         : 'var(--text-secondary)',
                  }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
        )
      })()}

      {loading ? (
        <p className="text-sm py-4" style={S.muted}>Loading…</p>
      ) : allEmpty ? (
        <EmptyState variant="card" icon="🎉" message="All clear — nothing to clarify." />
      ) : (
        <div className="space-y-3 mb-4">
          {(activeTab === 'all' || activeTab === 'tasks') && inboxTasks.length > 0 && (
            <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={S.blue}>📥 Inbox Tasks</h3>
              {inboxTasks.map(item => <ClarifyTaskRow key={item.id} task={item} />)}
            </div>
          )}
          {(activeTab === 'all' || activeTab === 'projects') && inboxProjects.length > 0 && (
            <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={S.purple}>📥 Inbox Projects</h3>
              {inboxProjects.map(item => (
                <ClarifyRow key={item.id} item={item} linkTo={`/projects/${item.id}`}
                  onDone={() => updateProject(item.id, { status: 'completed' })}
                  onScrap={() => updateProject(item.id, { archived_at: new Date().toISOString() })}
                />
              ))}
            </div>
          )}
          {(activeTab === 'all' || activeTab === 'people') && inboxPeople.length > 0 && (
            <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={S.green}>👤 Inbox People</h3>
              {inboxPeople.map(item => (
                <ClarifyRow key={item.id} item={item} linkTo={`/people/${item.id}`}
                  onDone={() => updatePerson(item.id, { status: 'active' })}
                  onScrap={() => updatePerson(item.id, { status: 'stale' })}
                />
              ))}
            </div>
          )}
          {(activeTab === 'all' || activeTab === 'stalled') && stalled.length > 0 && (
            <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-1" style={S.yellow}>⚠️ Stalled Projects</h3>
              <p className="text-xs mb-3" style={S.muted}>In progress with no active tasks</p>
              {stalled.map(item => (
                <ClarifyRow key={item.id} item={item} linkTo={`/projects/${item.id}`}
                  onDone={() => updateProject(item.id, { status: 'in_progress' })}
                  onScrap={() => updateProject(item.id, { archived_at: new Date().toISOString() })}
                />
              ))}
            </div>
          )}
          {(activeTab === 'all' || activeTab === 'overdue') && overdue.length > 0 && (
            <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-1" style={S.red}>🔴 Overdue Tasks</h3>
              <p className="text-xs mb-3" style={S.muted}>Past due date, not completed</p>
              {overdue.map(item => <ClarifyTaskRow key={item.id} task={item} />)}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <span className="text-sm" style={S.muted}>
          {done ? '✓ Clarify locked in — scroll up to adjust anything' : 'Sort every item above, then move on'}
        </span>
        {!done && <Button variant="primary" onClick={onDone}>Done Clarifying →</Button>}
      </div>
    </div>
  )
}

// ─── SECTION 3: REFLECT (tabbed list review) ──────────────────────────────────

const REFLECT_TABS = [
  { key: 'next_action',   label: 'Next Actions',  icon: '⚡', color: 'var(--accent)'        },
  { key: 'all_projects',  label: 'All Projects',  icon: '📁', color: 'var(--accent-purple)' },
  { key: 'waiting',       label: 'Waiting',       icon: '⏸',  color: 'var(--accent-yellow)' },
  { key: 'scheduled',     label: 'Scheduled',     icon: '📅', color: 'var(--accent-pink)'   },
  { key: 'someday',       label: 'Someday',       icon: '🌅', color: 'var(--text-secondary)'},
  { key: 'all_tasks',     label: 'All Tasks',     icon: '✅', color: 'var(--accent-green)'  },
]

function ReflectSection({ onDone, done }) {
  const [activeTab,   setActiveTab]   = useState('next_action')
  const [items,       setItems]       = useState({})
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [nextRes, projRes, waitRes, schedRes, somedayRes, allTasksRes] = await Promise.all([
          supabase.from('tasks').select('id, title, due_date, priority').eq('status', 'next_action').is('archived_at', null).order('created_at', { ascending: false }),
          supabase.from('projects').select('id, title, status').not('status', 'eq', 'completed').is('archived_at', null).order('updated_at', { ascending: false }),
          supabase.from('tasks').select('id, title, waiting_for').eq('status', 'waiting').is('archived_at', null).order('updated_at', { ascending: false }),
          supabase.from('tasks').select('id, title, due_date').eq('status', 'scheduled').is('archived_at', null).order('due_date', { ascending: true }),
          supabase.from('tasks').select('id, title').eq('status', 'someday').is('archived_at', null).order('updated_at', { ascending: false }),
          supabase.from('tasks').select('id, title, status, due_date').in('status', ['next_action', 'queued', 'waiting', 'scheduled', 'someday']).is('archived_at', null).order('status', { ascending: true }).order('due_date', { ascending: true }),
        ])
        setItems({
          next_action:  nextRes.data ?? [],
          all_projects: projRes.data ?? [],
          waiting:      waitRes.data ?? [],
          scheduled:    schedRes.data ?? [],
          someday:      somedayRes.data ?? [],
          all_tasks:    allTasksRes.data ?? [],
        })
      } catch (err) {
        console.error('ReflectSection load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const activeItems = items[activeTab] ?? []
  const activeMeta  = REFLECT_TABS.find(t => t.key === activeTab)

  return (
    <div className="rounded-2xl border p-6 mb-4" style={S.card}>
      <SectionHeader
        step={3}
        title="Reflect"
        subtitle="Scan your lists. Make sure everything is where it should be."
        done={done}
      />

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {REFLECT_TABS.map(t => {
          const count = (items[t.key] ?? []).length
          const active = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: active ? 'var(--border)' : 'transparent',
                color:           active ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {t.icon} {t.label}
              {count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none" style={{
                  backgroundColor: active ? 'var(--text-secondary)' : 'var(--border)',
                  color:           active ? 'var(--pane-bg)'         : 'var(--text-secondary)',
                }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm py-4" style={S.muted}>Loading…</p>
      ) : activeItems.length === 0 ? (
        <EmptyState variant="card" icon="✨" message={`Nothing in ${activeMeta?.label}.`} />
      ) : (
        <div className="rounded-xl border mb-4 overflow-hidden" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)' }}>
          {activeItems.map((item, i) => {
            const isProject = activeTab === 'all_projects'
            const linkTo    = isProject ? `/projects/${item.id}` : `/tasks/${item.id}`
            const sub       = item.status && activeTab === 'all_tasks' ? item.status.replace('_', ' ')
                            : item.due_date ? item.due_date
                            : item.waiting_for ? `waiting: ${item.waiting_for}`
                            : item.status && isProject ? item.status.replace('_', ' ')
                            : null
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                <span className="text-base shrink-0">{activeMeta?.icon}</span>
                <Link to={linkTo} className="flex-1 text-sm hover:underline truncate" style={{ color: 'var(--text-primary)' }}>
                  {item.title ?? `${item.first_name} ${item.last_name}`}
                </Link>
                {sub && <span className="text-xs shrink-0" style={S.muted}>{sub}</span>}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <span className="text-sm" style={S.muted}>
          {done ? '✓ Reflect locked in' : 'Review each list, then move on to the AI Review.'}
        </span>
        {!done && <Button variant="primary" onClick={onDone}>Done Reviewing →</Button>}
      </div>
    </div>
  )
}

// ─── SECTION 4: AI REVIEW ─────────────────────────────────────────────────────

function AIReviewSection({ review, locked, onSaveState, targetDate, gapStart, gapEnd, onComplete }) {
  const { configured: aiConfigured, loading: aiLoading } = useAIConfig()
  const aiConfiguredRef = useRef(false)
  useEffect(() => { aiConfiguredRef.current = aiConfigured }, [aiConfigured])

  const saved = review?.content ?? {}
  const [ctx,             setCtx]             = useState(null)
  const [questions,       setQuestions]       = useState(saved.questions ?? [])
  const [conversation,    setConversation]    = useState(saved.conversation ?? [])
  const [qIndex,          setQIndex]          = useState(saved.qIndex ?? 0)
  const [readyToGenerate, setReadyToGenerate] = useState(saved.readyToGenerate ?? false)
  const [typing,          setTyping]          = useState(false)
  const [inputVal,        setInputVal]        = useState('')
  const [inputActive,     setInputActive]     = useState(false)
  const [generating,      setGenerating]      = useState(false)
  const [suggestions,     setSuggestions]     = useState(review?.suggestions ?? [])
  const [showSuggestions, setShowSuggestions] = useState(review?.suggestions?.length > 0)
  const [completed,       setCompleted]       = useState(review?.status === 'completed')
  const [inProgress,      setInProgress]      = useState([])
  const chatRef  = useRef(null)
  const inputRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Persist conversation to DB on change
  useEffect(() => {
    if (conversation.length === 0) return
    onSaveState?.({ conversation, qIndex, readyToGenerate })
  }, [conversation, qIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const scrollChat = () => setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }), 50)

  const addBubble = useCallback((role, content) => {
    if (!mountedRef.current) return
    setConversation(prev => [...prev, { role, content }])
    scrollChat()
  }, [])

  const askQuestion = useCallback((q) => {
    if (!mountedRef.current) return
    setTyping(true)
    setInputActive(false)
    setTimeout(() => {
      if (!mountedRef.current) return
      setTyping(false)
      addBubble('ai', q)
      setInputActive(true)
      setTimeout(() => inputRef.current?.focus(), 50)
    }, 1200)
  }, [addBubble])

  // Start interview when section unlocks and AI config is ready
  useEffect(() => {
    if (aiLoading || locked) return

    let cancelled = false

    async function init() {
      const [ctxData, projRes] = await Promise.all([
        buildReflectContext({ gapStart, gapEnd, targetDate }),
        supabase.from('projects').select('id, title, status').eq('status', 'in_progress').is('archived_at', null).limit(6),
      ])
      if (cancelled || !mountedRef.current) return
      setCtx(ctxData)
      setInProgress(projRes.data ?? [])

      if (review?.status === 'completed') return

      // Rehydrate saved conversation — skip question generation
      if (saved.conversation?.length > 0) {
        // Plan not yet generated but was ready — re-trigger
        if (saved.readyToGenerate && !review?.suggestions?.length) {
          triggerGenerate(ctxData, saved.conversation ?? [])
          return
        }
        setInputActive(true)
        setTimeout(() => inputRef.current?.focus(), 50)
        return
      }

      setTyping(true)
      setTimeout(async () => {
        if (cancelled || !mountedRef.current) return
        if (aiConfiguredRef.current) {
          try {
            const qs = await generateReflectQuestions(ctxData)
            if (cancelled || !mountedRef.current) return
            setQuestions(qs)
            onSaveState?.({ questions: qs })
            setTyping(false)
            const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
            const gapLabel = ctxData.gapDays > 1
              ? `<strong>${fmtDate(ctxData.gapStart)} through ${fmtDate(ctxData.today)}</strong>`
              : `<strong>${fmtDate(ctxData.today)}</strong>`
            const gapNote = ctxData.gapDays > 1 ? ` That's ${ctxData.gapDays} days to cover.` : ''
            addBubble('ai', `Welcome back. I've been through your tasks, projects, and the last month of notes — planning ahead to ${fmtDate(ctxData.tomorrowStr)}. Let's get into it.`)
            setTimeout(() => { if (mountedRef.current) addBubble('ai', qs[0]) }, 900)
            setInputActive(true)
            setTimeout(() => inputRef.current?.focus(), 50)
          } catch {
            if (cancelled || !mountedRef.current) return
            setTyping(false)
            addBubble('ai', "Alright, let's do this. What was the highlight of your day — something that actually went well?")
            setInputActive(true)
          }
        } else {
          setTyping(false)
          addBubble('ai', "Set up an AI provider in <a href='/settings' style='color:var(--accent);text-decoration:underline;'>Settings</a> to enable the AI interview.")
        }
      }, 800)
    }

    init()
    return () => { cancelled = true }
  }, [aiLoading, locked, gapStart, gapEnd]) // eslint-disable-line react-hooks/exhaustive-deps

  const triggerGenerate = async (ctxOverride, convOverride) => {
    const activeCtx  = ctxOverride  ?? ctx
    const activeConv = convOverride ?? conversation
    if (!activeCtx)  { addBubble('ai', 'Context not loaded yet — give it a second and try again.'); return }
    if (!review?.id) { addBubble('ai', 'Review record missing — try refreshing the page.'); return }
    setGenerating(true)
    try {
      const result = await generateReflectPlan(activeCtx, activeConv, '')
      const { suggestions: newSuggestions } = await writeReflectResults(review.id, result, activeConv, ctx?.today ?? null, targetDate)
      if (!mountedRef.current) return
      setSuggestions(newSuggestions)
      setShowSuggestions(true)
      setTyping(true)
      setTimeout(() => {
        if (!mountedRef.current) return
        setTyping(false)
        addBubble('ai', "✨ Done. Tomorrow's locked in — top of mind, agenda, quote, and code challenge are sitting on the Daily page. Suggestions below are worth a look. Now close the laptop and go do something fun.")
      }, 800)
    } catch (err) {
      if (!mountedRef.current) return
      addBubble('ai', `Something went wrong building the plan: ${err.message}`)
    } finally {
      if (mountedRef.current) setGenerating(false)
    }
  }

  const handleSend = async () => {
    const val = inputVal.trim()
    if (!val || !inputActive) return
    addBubble('user', val)
    setInputVal('')
    setInputActive(false)

    const nextIndex = qIndex + 1
    setQIndex(nextIndex)

    // If AI already signalled ready, next user message triggers generation
    if (readyToGenerate) {
      triggerGenerate()
      return
    }

    // Build the full conversation including the message just sent
    const newConversation = [...conversation, { role: 'user', content: val }]
    const remainingTopics = questions.slice(nextIndex)

    setTyping(true)
    const dateContext = ctx ? {
      reviewDate: ctx.today, planDate: ctx.tomorrowStr,
      gapStart: ctx.gapStart, gapDays: ctx.gapDays,
      weekendDays: ctx.weekendDays, holidayDays: ctx.holidayDays,
      recentMemories: ctx.recentMemories,
    } : {}
    try {
      const { message, ready, created = [] } = await generateConversationalResponse(newConversation, remainingTopics, dateContext)
      if (!mountedRef.current) return
      setTyping(false)
      // Show any items the AI created as system notices in the chat
      for (const item of created) {
        const label = item.tool === 'create_task' ? `✓ Task added: ${item.result.title}`
          : item.tool === 'create_project' ? `✓ Project added: ${item.result.title}`
          : item.tool === 'create_person' ? `✓ Person added: ${item.result.first_name} ${item.result.last_name}`
          : item.tool === 'update_task' ? `✓ Task updated: ${item.result.title}`
          : item.tool === 'delete_task' ? `✓ Task deleted`
          : null
        if (label) addBubble('system', label)
      }
      addBubble('ai', message)
      if (ready) {
        // AI is done — generate the plan immediately, no extra user message needed
        setTimeout(() => { if (mountedRef.current) triggerGenerate() }, 600)
      } else {
        setInputActive(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    } catch {
      if (!mountedRef.current) return
      setTyping(false)
      // Fallback: next scripted question or wrap-up
      if (remainingTopics.length > 0) {
        addBubble('ai', remainingTopics[0])
        setInputActive(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      } else {
        addBubble('ai', "That's what I needed. Locking in the plan now…")
        setTimeout(() => { if (mountedRef.current) triggerGenerate() }, 600)
      }
    }
  }

  const handleComplete = async () => {
    if (!review?.id) return
    await completeReview(review.id)
    if (!mountedRef.current) return
    setCompleted(true)
    onComplete?.()
  }

  const handleSuggestionChange = async (updated) => {
    setSuggestions(updated)
    if (review?.id) await updateSuggestions(review.id, updated)
  }

  return (
    <div className="rounded-2xl border p-6 mb-4" style={S.card}>
      <SectionHeader
        step={4}
        title="AI Review"
        subtitle={
          <>
            {ctx && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mr-2" style={{ backgroundColor: 'var(--border)', color: 'var(--accent)' }}>
                📅 Planning {new Date(ctx.tomorrowStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            )}
            {aiConfigured
              ? "Your AI sidekick has been snooping through your tasks, projects, and last 30 days of notes. Answer however feels right."
              : "Take a few minutes to reflect on your day and wrap it up."}
          </>
        }
        done={completed}
      />

      {/* Chat */}
      <div
        ref={chatRef}
        className="rounded-xl border p-4 space-y-3 overflow-y-auto mb-3"
        style={{ ...S.card, minHeight: 100, maxHeight: 400 }}
      >
        <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }`}</style>
        {conversation.length === 0 && !typing && (
          <p className="text-sm text-center py-4" style={S.muted}>Complete Clarify above to start the AI interview…</p>
        )}
        {conversation.map((msg, i) => (
          <Bubble key={i} role={msg.role}>{msg.content}</Bubble>
        ))}
        {typing && <TypingIndicator />}
      </div>

      {/* Input */}
      {inputActive && !completed && (
        <div className="flex gap-2 mb-3">
          <textarea
            ref={inputRef}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Type your answer… (Enter to send)"
            rows={2}
            className="flex-1 px-3 py-2 rounded-xl border text-sm outline-none resize-none"
            style={{ ...S.input, transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <Button variant="primary" onClick={handleSend}>Send</Button>
        </div>
      )}

      {/* Generating indicator */}
      {generating && (
        <div className="flex items-center gap-2 text-sm py-2 mb-3" style={S.muted}>
          <Loader2 size={14} className="animate-spin" />
          Building your plan…
        </div>
      )}

      {/* Suggestions — appear as soon as plan is generated */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="mt-2 space-y-3 mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={S.blue}>💡 Suggestions</h3>
          {suggestions.map((s, i) => (
            <SuggestionCard
              key={s.id ?? i}
              suggestion={s}
              onAccept={() => handleSuggestionChange(suggestions.map((x, j) => j === i ? { ...x, status: 'accepted' } : x))}
              onSkip={() => handleSuggestionChange(suggestions.map((x, j) => j === i ? { ...x, status: 'skipped' } : x))}
              onEdit={edited => handleSuggestionChange(suggestions.map((x, j) => j === i ? { ...x, status: 'accepted', content: edited } : x))}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <span className="text-sm" style={S.muted}>
          {completed ? '✓ Review complete — see you tomorrow' : 'Wrap it up when you\'re ready'}
        </span>
        {completed ? (
          <span className="text-sm px-3 py-1 rounded-lg border" style={{ backgroundColor: 'var(--state-success-bg)', borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}>
            ✓ Review Complete
          </span>
        ) : (
          <Button variant="success" onClick={handleComplete}>Complete Review ✓</Button>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Reviews() {
  const { type: urlType } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const today = new Date().toLocaleDateString('en-CA')

  const activeType = ['daily', 'weekly', 'monthly'].includes(urlType) ? urlType : 'daily'

  const yesterday = (() => {
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    return d.toLocaleDateString('en-CA')
  })()
  const tomorrow = (() => {
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    return d.toLocaleDateString('en-CA')
  })()

  const [gapStart, setGapStart] = useState(null)   // day after last completed review
  const gapEnd = yesterday                          // most recent day to cover
  const [targetDate, setTargetDate] = useState(tomorrow)  // user picks where plan goes

  const [review,           setReview]           = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [loadError,        setLoadError]        = useState(null)
  const [retryCount,       setRetryCount]       = useState(0)
  const [todayNoteId,      setTodayNoteId]      = useState(null)
  const [captureComplete,  setCaptureComplete]  = useState(false)
  const [clarifyComplete,  setClarifyComplete]  = useState(false)
  const [reflectComplete,  setReflectComplete]  = useState(false)
  const [captureVersion,   setCaptureVersion]   = useState(0)
  const [resetting,        setResetting]        = useState(false)

  const reviewRef  = useRef(null)
  const contentRef = useRef({})

  const saveContent = useCallback(async (patch) => {
    if (!reviewRef.current?.id) return
    contentRef.current = { ...contentRef.current, ...patch }
    await updateReviewContent(reviewRef.current.id, contentRef.current).catch(() => {})
  }, [])

  const markCaptureDone = useCallback(async () => {
    setCaptureComplete(true)
    await saveContent({ captureComplete: true })
  }, [saveContent])

  const markClarifyDone = useCallback(async () => {
    setClarifyComplete(true)
    await saveContent({ clarifyComplete: true })
  }, [saveContent])

  const aiReviewRef = useRef(null)

  const markReflectDone = useCallback(async () => {
    setReflectComplete(true)
    await saveContent({ reflectComplete: true })
    setTimeout(() => aiReviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
  }, [saveContent])

  const resetReview = useCallback(async () => {
    if (!reviewRef.current?.id || resetting) return
    setResetting(true)

    await Promise.all([
      supabase
        .from('reviews')
        .update({ content: {}, status: 'draft', suggestions: [] })
        .eq('id', reviewRef.current.id),
      supabase
        .from('daily_notes')
        .update({ top_of_mind: [], agenda: null, code_challenge: null, quote: null, quote_author: null })
        .eq('date', targetDate),
    ])

    setTargetDate(tomorrow)
    setRetryCount(c => c + 1)
    setResetting(false)
  }, [resetting, targetDate, tomorrow])

  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    Promise.all([
      ensureReview(activeType, today),
      supabase.from('daily_notes').select('id').eq('date', today).maybeSingle(),
      // Find last completed review to determine the gap start
      activeType === 'daily'
        ? supabase.from('reviews').select('date').eq('type', 'daily').eq('status', 'completed').lt('date', today).order('date', { ascending: false }).limit(1).maybeSingle()
        : Promise.resolve({ data: null }),
    ]).then(([r, noteRes, lastReviewRes]) => {
      reviewRef.current = r
      const content = r.content ?? {}
      contentRef.current = content
      setReview(r)
      setCaptureComplete(!!content.captureComplete)
      setClarifyComplete(!!content.clarifyComplete)
      setReflectComplete(!!content.reflectComplete)
      setTodayNoteId(noteRes.data?.id ?? null)

      // Compute gapStart: day after last completed review, capped at 14 days back
      const lastReviewDate = lastReviewRes?.data?.date ?? null
      if (lastReviewDate) {
        const d = new Date(lastReviewDate + 'T12:00:00')
        d.setDate(d.getDate() + 1)
        const computed = d.toLocaleDateString('en-CA')
        // Don't go back more than 14 days
        const cap = new Date(today + 'T12:00:00')
        cap.setDate(cap.getDate() - 14)
        const capStr = cap.toLocaleDateString('en-CA')
        setGapStart(computed < capStr ? capStr : computed)
      } else {
        setGapStart(yesterday)  // no prior reviews — just use yesterday
      }
    }).catch(err => {
      console.error('Reviews load error:', err)
      setLoadError(err.message ?? 'Failed to load review session.')
    }).finally(() => {
      setLoading(false)
    })
  }, [activeType, today, retryCount])

  const REVIEW_TYPES = [
    { key: 'daily',   label: '📋 Daily'   },
    { key: 'weekly',  label: '📅 Weekly'  },
    { key: 'monthly', label: '📆 Monthly' },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <h1 className="text-xl font-semibold" style={S.text}>Reviews</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={resetReview}
            disabled={resetting || loading}
            title="Reset review — clears the plan written to the target date"
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'transparent', opacity: resetting ? 0.5 : 1 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-red)'; e.currentTarget.style.color = 'var(--accent-red)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <RotateCcw size={12} />
            {resetting ? 'Resetting…' : 'Reset'}
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={S.muted}>Planning for:</span>
            <input
              type="date"
              value={targetDate}
              min={today}
              onChange={e => e.target.value && setTargetDate(e.target.value)}
              className="text-xs px-2 py-1 rounded-lg border outline-none"
              style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <p className="text-sm" style={S.muted}>
            {new Date(today + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        {REVIEW_TYPES.map(rt => (
          <button
            key={rt.key}
            onClick={() => navigate(`/reviews/${rt.key}`)}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: activeType === rt.key ? 'var(--border)' : 'transparent',
              color: activeType === rt.key ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {rt.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={S.muted}>Loading…</p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <p className="text-sm font-medium" style={S.red}>Failed to start review session.</p>
            <p className="text-xs" style={S.muted}>{loadError}</p>
            <button className="text-xs mt-2 underline" style={S.blue} onClick={() => setRetryCount(c => c + 1)}>Retry</button>
          </div>
        ) : activeType === 'daily' ? (
          <div className="max-w-2xl mx-auto px-6 py-6">
            <CaptureSection
              done={captureComplete}
              onDone={markCaptureDone}
              todayNoteId={todayNoteId}
              onCapture={() => setCaptureVersion(v => v + 1)}
            />

            <SectionWrapper locked={!captureComplete} lockLabel="Complete Capture first">
              <ClarifySection
                key={String(captureComplete)}
                done={clarifyComplete}
                onDone={markClarifyDone}
                captureVersion={captureVersion}
              />
            </SectionWrapper>

            <SectionWrapper locked={!clarifyComplete} lockLabel="Complete Clarify first">
              <ReflectSection
                done={reflectComplete}
                onDone={markReflectDone}
              />
            </SectionWrapper>

            <div ref={aiReviewRef}>
            <SectionWrapper locked={!reflectComplete} lockLabel="Complete Reflect first">
              <AIReviewSection
                review={review}
                locked={!reflectComplete}
                onSaveState={saveContent}
                targetDate={targetDate}
                gapStart={gapStart}
                gapEnd={gapEnd}
                onComplete={() => navigate(`/daily?date=${tomorrow}`)}
              />
            </SectionWrapper>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-6 py-12 text-center">
            <p className="text-4xl mb-4">🚧</p>
            <p className="text-sm font-medium mb-1" style={S.text}>{activeType.charAt(0).toUpperCase() + activeType.slice(1)} review coming soon.</p>
            <p className="text-sm" style={S.muted}>The daily flow is taking shape first — weekly and monthly will follow the same pattern.</p>
          </div>
        )}
      </div>
    </div>
  )
}
