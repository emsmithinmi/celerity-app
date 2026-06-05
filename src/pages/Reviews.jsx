import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Pencil, RotateCcw, Loader2 } from 'lucide-react'
import { ensureReview, updateReviewContent, completeReview, updateSuggestions } from '../lib/api/reviews'
import { buildReflectContext, generateReflectQuestions, generateReflectPlan, writeReflectResults } from '../lib/ai/skills/reflectReview'
import { useAIConfig } from '../hooks/useAI'
import { createTask, updateTask } from '../lib/api/tasks'
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
      <p className="text-sm ml-7" style={S.muted}>{subtitle}</p>
    </div>
  )
}

// ─── Clarify action button (compact) ─────────────────────────────────────────

const ACTION_STYLES = {
  success:   { bg: 'var(--state-success-bg)',  border: 'var(--accent-green)',  text: 'var(--accent-green)'  },
  primary:   { bg: 'var(--card-task-bg)',       border: 'var(--accent)',        text: 'var(--accent)'        },
  warning:   { bg: 'var(--card-reminder-bg)',   border: 'var(--accent-yellow)', text: 'var(--accent-yellow)' },
  secondary: { bg: 'var(--border)',             border: 'var(--text-dim)',      text: 'var(--text-secondary)'},
  ghost:     { bg: 'transparent',              border: 'var(--border)',        text: 'var(--text-secondary)'},
  danger:    { bg: 'var(--state-error-bg)',     border: 'var(--accent-red)',    text: 'var(--accent-red)'    },
}

function ActionBtn({ variant = 'ghost', onClick, disabled, children }) {
  const s = ACTION_STYLES[variant] ?? ACTION_STYLES.ghost
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-2 py-1 rounded text-xs font-medium border transition-colors"
      style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text, opacity: disabled ? 0.4 : 1, cursor: disabled ? 'default' : 'pointer' }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.backgroundColor = s.border; e.currentTarget.style.color = 'var(--app-bg)' } }}
      onMouseLeave={e => { if (!disabled) { e.currentTarget.style.backgroundColor = s.bg;     e.currentTarget.style.color = s.text } }}
    >
      {children}
    </button>
  )
}

// ─── Clarify task row ─────────────────────────────────────────────────────────

function ClarifyTaskRow({ task }) {
  const [resolved,        setResolved]        = useState(false)
  const [resolvedLabel,   setResolvedLabel]   = useState('')
  const [prompt,          setPrompt]          = useState(null)
  const [promptValue,     setPromptValue]     = useState('')
  const [projects,        setProjects]        = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [saving,          setSaving]          = useState(false)

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
    <div className="rounded-lg border mb-1.5 overflow-hidden" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)' }}>
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
          <ActionBtn variant="warning" disabled={!promptValue || saving} onClick={() => resolve(() => updateTask(task.id, { status: 'scheduled', due_date: promptValue }), 'Scheduled').then(() => setPrompt(null))}>Set</ActionBtn>
          <ActionBtn variant="ghost" onClick={() => setPrompt(null)}>✕</ActionBtn>
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
          <ActionBtn variant="danger" disabled={!promptValue.trim() || saving} onClick={() => resolve(() => updateTask(task.id, { status: 'waiting', waiting_for: promptValue.trim() }), 'Waiting').then(() => setPrompt(null))}>Set</ActionBtn>
          <ActionBtn variant="ghost" onClick={() => setPrompt(null)}>✕</ActionBtn>
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
            <ActionBtn variant="primary" disabled={!selectedProject || saving} onClick={() => resolve(() => updateTask(task.id, { status: 'queued', project_id: selectedProject }), 'Queued').then(() => setPrompt(null))}>Queue It</ActionBtn>
            <ActionBtn variant="ghost" onClick={() => setPrompt(null)}>✕</ActionBtn>
          </div>
        </div>
      )}

      {!prompt && (
        <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
          {status === 'inbox' && !task.project_id && (
            <>
              <ActionBtn variant="success"   onClick={() => resolve(() => updateTask(task.id, { status: 'done' }),         'All Done')}>All Done</ActionBtn>
              <ActionBtn variant="primary"   onClick={() => resolve(() => updateTask(task.id, { status: 'next_action' }),  'In Coach')}>Put Me in Coach</ActionBtn>
              <ActionBtn variant="warning"   onClick={() => openPrompt('schedule')}>Let's Schedule This</ActionBtn>
              <ActionBtn variant="secondary" onClick={() => openPrompt('route')}>Assign to Project →</ActionBtn>
              <ActionBtn variant="ghost"     onClick={() => resolve(() => updateTask(task.id, { status: 'someday' }),      'Someday')}>Another Day</ActionBtn>
              <ActionBtn variant="danger"    onClick={() => resolve(() => updateTask(task.id, { archived_at: new Date().toISOString() }), 'Scrapped')}>Scrap This</ActionBtn>
            </>
          )}
          {status === 'inbox' && task.project_id && (
            <>
              <ActionBtn variant="success"   onClick={() => resolve(() => updateTask(task.id, { status: 'done' }),    'All Done')}>All Done</ActionBtn>
              <ActionBtn variant="primary"   onClick={() => resolve(() => updateTask(task.id, { status: 'queued' }), 'Queued')}>Ready to Queue Up</ActionBtn>
              <ActionBtn variant="warning"   onClick={() => openPrompt('schedule')}>Let's Schedule This</ActionBtn>
              <ActionBtn variant="ghost"     onClick={() => resolve(() => updateTask(task.id, { status: 'someday' }), 'Someday')}>Another Day</ActionBtn>
              <ActionBtn variant="danger"    onClick={() => resolve(() => updateTask(task.id, { archived_at: new Date().toISOString() }), 'Scrapped')}>Scrap This</ActionBtn>
            </>
          )}
          {status === 'next_action' && (
            <>
              <ActionBtn variant="success" onClick={() => resolve(() => updateTask(task.id, { status: 'done' }),    'All Done')}>All Done</ActionBtn>
              <ActionBtn variant="danger"  onClick={() => openPrompt('waiting')}>There is a Holdup</ActionBtn>
              <ActionBtn variant="warning" onClick={() => openPrompt('schedule')}>Let's Schedule This</ActionBtn>
              <ActionBtn variant="ghost"   onClick={() => resolve(() => updateTask(task.id, { archived_at: new Date().toISOString() }), 'Scrapped')}>Scrap This</ActionBtn>
            </>
          )}
          {status === 'queued' && (
            <ActionBtn variant="primary" onClick={() => resolve(() => updateTask(task.id, { status: 'next_action' }), 'In Coach')}>Put Me in Coach</ActionBtn>
          )}
          {status === 'waiting' && (
            <ActionBtn variant="primary" onClick={() => resolve(() => updateTask(task.id, { status: 'next_action', waiting_for: null }), 'Unblocked')}>Clear Blocker</ActionBtn>
          )}
          {status === 'scheduled' && (
            <>
              <ActionBtn variant="success"   onClick={() => resolve(() => updateTask(task.id, { status: 'done' }),          'All Done')}>All Done</ActionBtn>
              <ActionBtn variant="secondary" onClick={() => resolve(() => updateTask(task.id, { status: 'next_action' }),   'In Coach')}>Put Me in Coach</ActionBtn>
            </>
          )}
          {status === 'someday' && (
            <>
              <ActionBtn variant="primary" onClick={() => resolve(() => updateTask(task.id, { status: 'next_action' }), 'In Coach')}>Put Me in Coach</ActionBtn>
              <ActionBtn variant="danger"  onClick={() => resolve(() => updateTask(task.id, { archived_at: new Date().toISOString() }), 'Scrapped')}>Scrap This</ActionBtn>
            </>
          )}
        </div>
      )}
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

function CaptureSection({ onDone, done, todayNoteId }) {
  const [modal,    setModal]    = useState(null)
  const [captured, setCaptured] = useState([])

  const addCaptured = (type, title) => setCaptured(prev => [...prev, { type, title }])

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
        title="What's on your mind?"
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

function ClarifySection({ onDone, done }) {
  const today = new Date().toLocaleDateString('en-CA')
  const [inboxTasks,    setInboxTasks]    = useState([])
  const [inboxProjects, setInboxProjects] = useState([])
  const [inboxPeople,   setInboxPeople]   = useState([])
  const [stalled,       setStalled]       = useState([])
  const [overdue,       setOverdue]       = useState([])
  const [loading,       setLoading]       = useState(true)

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
  }, [today])

  const daysDiff = (dateStr) => {
    const diff = Math.floor((new Date(today) - new Date(dateStr)) / 86400000)
    return diff === 1 ? '1d overdue' : `${diff}d overdue`
  }

  const allEmpty = !inboxTasks.length && !inboxProjects.length && !inboxPeople.length && !stalled.length && !overdue.length

  return (
    <div className="rounded-2xl border p-6 mb-4" style={S.card}>
      <SectionHeader
        step={2}
        title="What does each item mean?"
        subtitle="Process what's in your inbox. Mark done when sorted, scrap if it's noise."
        done={done}
      />

      {loading ? (
        <p className="text-sm py-4" style={S.muted}>Loading…</p>
      ) : allEmpty ? (
        <div className="rounded-xl border p-6 text-center mb-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-sm font-medium" style={S.green}>All clear — nothing to clarify.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {inboxTasks.length > 0 && (
            <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={S.blue}>📥 Inbox Tasks</h3>
              {inboxTasks.map(item => <ClarifyTaskRow key={item.id} task={item} />)}
            </div>
          )}
          {inboxProjects.length > 0 && (
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
          {inboxPeople.length > 0 && (
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
          {stalled.length > 0 && (
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
          {overdue.length > 0 && (
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

// ─── SECTION 3: REFLECT ───────────────────────────────────────────────────────

function ReflectSection({ review, locked, onSaveState, targetDate }) {
  const { configured: aiConfigured, loading: aiLoading } = useAIConfig()
  const aiConfiguredRef = useRef(false)
  useEffect(() => { aiConfiguredRef.current = aiConfigured }, [aiConfigured])

  const saved = review?.content ?? {}
  const [ctx,             setCtx]             = useState(null)
  const [questions,       setQuestions]       = useState(saved.questions ?? [])
  const [conversation,    setConversation]    = useState(saved.conversation ?? [])
  const [qIndex,          setQIndex]          = useState(saved.qIndex ?? 0)
  const [typing,          setTyping]          = useState(false)
  const [inputVal,        setInputVal]        = useState('')
  const [inputActive,     setInputActive]     = useState(false)
  const [scratchpad,      setScratchpad]      = useState(saved.scratchpad ?? '')
  const [showScratch,     setShowScratch]     = useState(saved.showScratch ?? false)
  const [generating,      setGenerating]      = useState(false)
  const [suggestions,     setSuggestions]     = useState(review?.suggestions ?? [])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [completed,       setCompleted]       = useState(review?.status === 'completed')
  const [nextActions,     setNextActions]     = useState([])
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
    onSaveState?.({ conversation, qIndex })
  }, [conversation, qIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist scratchpad (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      if (scratchpad || showScratch) onSaveState?.({ scratchpad, showScratch })
    }, 600)
    return () => clearTimeout(t)
  }, [scratchpad, showScratch]) // eslint-disable-line react-hooks/exhaustive-deps

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
      const [ctxData, nextRes, projRes] = await Promise.all([
        buildReflectContext(),
        supabase.from('tasks').select('id, title, due_date').eq('status', 'next_action').is('archived_at', null).limit(8),
        supabase.from('projects').select('id, title, status').eq('status', 'in_progress').is('archived_at', null).limit(6),
      ])
      if (cancelled || !mountedRef.current) return
      setCtx(ctxData)
      setNextActions(nextRes.data ?? [])
      setInProgress(projRes.data ?? [])

      if (review?.status === 'completed') return

      // Rehydrate saved conversation — skip question generation
      if (saved.conversation?.length > 0) {
        const qs = saved.questions ?? []
        const qi = saved.qIndex ?? 0
        if (qi < qs.length) {
          setInputActive(true)
          setTimeout(() => inputRef.current?.focus(), 50)
        }
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
            addBubble('ai', qs[0])
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
          addBubble('ai', "Set up an AI provider in <a href='/settings' style='color:var(--accent);text-decoration:underline;'>Settings</a> to enable the AI interview. You can still generate a plan with the scratchpad below.")
          setShowScratch(true)
        }
      }, 800)
    }

    init()
    return () => { cancelled = true }
  }, [aiLoading, locked]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = () => {
    const val = inputVal.trim()
    if (!val || !inputActive) return
    addBubble('user', val)
    setInputVal('')
    setInputActive(false)

    const nextIndex = qIndex + 1
    setQIndex(nextIndex)

    if (nextIndex < questions.length) {
      askQuestion(questions[nextIndex])
    } else {
      setTyping(true)
      setTimeout(() => {
        if (!mountedRef.current) return
        setTyping(false)
        addBubble('ai', "Got it. Anything else on your mind before I put tomorrow together? Drop it in the notes below, then hit Generate.")
        setShowScratch(true)
      }, 1200)
    }
  }

  const handleGenerate = async () => {
    if (!ctx) { addBubble('ai', 'Context not loaded yet — please wait a moment and try again.'); return }
    if (!review?.id) { addBubble('ai', 'Review record missing — try refreshing the page.'); return }
    setGenerating(true)
    try {
      const result = await generateReflectPlan(ctx, conversation, scratchpad)
      const { suggestions: newSuggestions } = await writeReflectResults(review.id, result, targetDate)
      if (!mountedRef.current) return
      setSuggestions(newSuggestions)
      setTyping(true)
      setTimeout(() => {
        if (!mountedRef.current) return
        setTyping(false)
        addBubble('ai', "✨ Done. Tomorrow's locked in — top of mind, agenda, quote, and your code challenge are all sitting on the Daily page. I checked your email queue and the calendar too, so the suggestions below are worth a look. Now close the laptop and go do something fun. You put in the work.")
      }, 800)
    } catch (err) {
      addBubble('ai', `Something went wrong generating the plan: ${err.message}`)
    } finally {
      if (mountedRef.current) setGenerating(false)
    }
  }

  const handleComplete = async () => {
    if (!review?.id) return
    await completeReview(review.id)
    if (!mountedRef.current) return
    setCompleted(true)
    setShowSuggestions(true)
  }

  const handleSuggestionChange = async (updated) => {
    setSuggestions(updated)
    if (review?.id) await updateSuggestions(review.id, updated)
  }

  return (
    <div className="rounded-2xl border p-6 mb-4" style={S.card}>
      <SectionHeader
        step={3}
        title="How'd it go today?"
        subtitle={
          aiConfigured
            ? "Your AI sidekick has been snooping through your tasks, projects, and last 30 days of notes. Answer however feels right."
            : "Take a few minutes to reflect on your day and wrap it up."
        }
        done={completed}
      />

      {/* Reference cards */}
      {nextActions.length > 0 && (
        <RefCard title="⚡ Next Actions" count={nextActions.length}>
          <div className="space-y-1">
            {nextActions.map(t => (
              <Link key={t.id} to={`/tasks/${t.id}`} className="block text-sm py-1.5 border-b hover:underline" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                {t.title}
                {t.due_date && <span className="ml-2 text-xs" style={S.muted}>{t.due_date}</span>}
              </Link>
            ))}
          </div>
        </RefCard>
      )}
      {inProgress.length > 0 && (
        <RefCard title="📁 Projects In Progress" count={inProgress.length}>
          <div className="space-y-1">
            {inProgress.map(p => (
              <Link key={p.id} to={`/projects/${p.id}`} className="block text-sm py-1.5 border-b hover:underline" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                {p.title}
              </Link>
            ))}
          </div>
        </RefCard>
      )}

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

      {/* Scratchpad */}
      {showScratch && !completed && (
        <div className="rounded-xl border p-4 mb-3" style={S.card}>
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={S.muted}>📝 Notes for Today</h3>
          <textarea
            value={scratchpad}
            onChange={e => setScratchpad(e.target.value)}
            placeholder="Brain dump anything that came up — it goes into the AI context."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
            style={{ ...S.input, transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
      )}

      {/* Generate */}
      {showScratch && !completed && !generating && suggestions.length === 0 && aiConfigured && (
        <Button variant="action" size="md" onClick={handleGenerate} disabled={generating} className="w-full mb-3">
          ✨ Generate Tomorrow's Plan
        </Button>
      )}
      {generating && (
        <div className="text-center py-3 mb-3">
          <p className="text-sm" style={S.muted}>Generating your plan…</p>
        </div>
      )}

      {/* Suggestions */}
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
  const targetDate = searchParams.get('gate') === 'today' ? today : null

  const activeType = ['daily', 'weekly', 'monthly'].includes(urlType) ? urlType : 'daily'

  const [review,           setReview]           = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [loadError,        setLoadError]        = useState(null)
  const [retryCount,       setRetryCount]       = useState(0)
  const [todayNoteId,      setTodayNoteId]      = useState(null)
  const [captureComplete,  setCaptureComplete]  = useState(false)
  const [clarifyComplete,  setClarifyComplete]  = useState(false)
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

  const resetReview = useCallback(async () => {
    if (!reviewRef.current?.id || resetting) return
    setResetting(true)
    await supabase
      .from('reviews')
      .update({ content: {}, status: 'draft', suggestions: [] })
      .eq('id', reviewRef.current.id)
    setRetryCount(c => c + 1)
    setResetting(false)
  }, [resetting])

  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    Promise.all([
      ensureReview(activeType, today),
      supabase.from('daily_notes').select('id').eq('date', today).maybeSingle(),
    ]).then(([r, noteRes]) => {
      reviewRef.current = r
      const content = r.content ?? {}
      contentRef.current = content
      setReview(r)
      setCaptureComplete(!!content.captureComplete)
      setClarifyComplete(!!content.clarifyComplete)
      setTodayNoteId(noteRes.data?.id ?? null)
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
            title="Reset review for testing"
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'transparent', opacity: resetting ? 0.5 : 1 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-red)'; e.currentTarget.style.color = 'var(--accent-red)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <RotateCcw size={12} />
            {resetting ? 'Resetting…' : 'Reset'}
          </button>
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
            />

            <SectionWrapper locked={!captureComplete} lockLabel="Complete Capture first">
              <ClarifySection
                done={clarifyComplete}
                onDone={markClarifyDone}
              />
            </SectionWrapper>

            <SectionWrapper locked={!clarifyComplete} lockLabel="Complete Clarify first">
              <ReflectSection
                review={review}
                locked={!clarifyComplete}
                onSaveState={saveContent}
                targetDate={targetDate}
              />
            </SectionWrapper>
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
