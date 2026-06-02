import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
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

// ─── Step progress bar ────────────────────────────────────────────────────────

const STEPS = ['Capture', 'Clarify', 'Reflect']

function StepBar({ current, onNavigate }) {
  return (
    <div className="flex items-center px-6 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
      {STEPS.map((label, i) => {
        const done   = i < current
        const active = i === current
        return (
          <button
            key={label}
            onClick={() => onNavigate(i)}
            className="flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap"
            style={{
              borderColor: active ? 'var(--accent)' : done ? 'var(--accent-green)' : 'transparent',
              color: active ? 'var(--accent)' : done ? 'var(--accent-green)' : 'var(--text-secondary)',
              background: 'transparent',
            }}
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                backgroundColor: active ? 'var(--accent)' : done ? 'var(--accent-green)' : 'var(--border)',
                color: active || done ? 'var(--app-bg)' : 'var(--text-secondary)',
              }}
            >
              {done ? '✓' : i + 1}
            </span>
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Clarify row ──────────────────────────────────────────────────────────────

function ClarifyRow({ item, linkTo, onDone, onScrap, meta }) {
  const [state, setState] = useState('pending')

  const handleDone = async () => {
    setState('done')
    await onDone(item)
  }
  const handleScrap = async () => {
    setState('scrapped')
    await onScrap(item)
  }

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
            onClick={handleDone}
            title="Done"
            className="w-7 h-7 rounded-md flex items-center justify-center text-sm transition-colors"
            style={{ backgroundColor: 'var(--state-success-bg)', color: 'var(--accent-green)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--accent-green)'; e.currentTarget.style.color = 'var(--app-bg)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--state-success-bg)'; e.currentTarget.style.color = 'var(--accent-green)' }}
          >✓</button>
          <button
            onClick={handleScrap}
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

function ClarifySection({ title, titleColor = 'var(--accent)', items, renderRow, emptyText }) {
  if (!items.length) return null
  return (
    <div className="rounded-xl border p-4 mb-3" style={S.card}>
      <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: titleColor }}>{title}</h3>
      {items.length === 0
        ? <p className="text-sm" style={S.muted}>{emptyText}</p>
        : items.map(renderRow)
      }
    </div>
  )
}

// ─── Suggestion card ──────────────────────────────────────────────────────────

function SuggestionCard({ suggestion, onAccept, onSkip, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [edited,  setEdited]  = useState(suggestion.content)

  const TYPE_COLORS = {
    task_update:    { bg: 'var(--card-task-bg)', border: 'var(--accent)', text: 'var(--accent)' },
    project_update: { bg: 'var(--card-project-bg)', border: 'var(--accent-purple)', text: 'var(--accent-purple)' },
    new_task:       { bg: 'var(--state-success-bg)', border: 'var(--accent-green)', text: 'var(--accent-green)' },
    reminder:       { bg: 'var(--card-reminder-bg)', border: 'var(--accent-orange)', text: 'var(--accent-orange)' },
    insight:        { bg: 'var(--card-insight-bg)', border: 'var(--accent-pink)', text: 'var(--accent-pink)' },
  }
  const colors = TYPE_COLORS[suggestion.type] ?? TYPE_COLORS.insight
  if (suggestion.status === 'skipped') return null

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
      <div className="flex gap-2">
        {editing ? (
          <>
            <Button size="sm" variant="success" onClick={() => { onEdit(edited); setEditing(false) }}>Accept Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </>
        ) : (
          <>
            {suggestion.status !== 'accepted' && (
              <Button size="sm" variant="success" onClick={onAccept}>✓ Accept</Button>
            )}
            {suggestion.status !== 'accepted' && (
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
            <Button size="sm" variant="ghost" onClick={onSkip}>✕ Skip</Button>
            {suggestion.status === 'accepted' && (
              <span className="text-xs self-center" style={S.green}>✓ Accepted</span>
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

// ─── STEP 1: CAPTURE ──────────────────────────────────────────────────────────

function CaptureStep({ onNext, todayNoteId }) {
  const [modal,     setModal]     = useState(null)
  const [captured,  setCaptured]  = useState([])

  const addCaptured = (type, title) => setCaptured(prev => [...prev, { type, title }])

  const handleCreateTask = async (title) => {
    await createTask({ title, status: 'inbox' })
    addCaptured('task', title)
  }
  const handleCreateProject = async (title) => {
    await createProject({ title })
    addCaptured('project', title)
  }
  const handleCreatePerson = async ({ first_name, last_name }) => {
    await createPerson({ first_name, last_name })
    addCaptured('person', `${first_name} ${last_name}`)
  }
  const handleAddNote = async (body) => {
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
    <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={S.muted}>Step 1 of 3</p>
        <h2 className="text-2xl font-semibold mb-2" style={S.text}>What's on your mind?</h2>
        <p className="text-sm" style={S.muted}>Get everything out of your head. Don't filter, don't organize — just capture.</p>
      </div>

      {/* Capture buttons */}
      <div className="grid grid-cols-2 gap-3">
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
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.backgroundColor = 'var(--border)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--text-dim)'; e.currentTarget.style.backgroundColor = 'var(--border)' }}
          >
            <div className="text-xl mb-1">{icon}</div>
            <div className="text-sm font-medium" style={S.text}>{label}</div>
            <div className="text-xs mt-0.5" style={S.muted}>{sub}</div>
          </button>
        ))}
      </div>

      {/* Captured this session */}
      {captured.length > 0 && (
        <div className="space-y-1.5 mt-2">
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
        <span className="text-sm" style={S.muted}>{captured.length > 0 ? `${captured.length} item${captured.length !== 1 ? 's' : ''} captured` : 'Capture anything on your mind'}</span>
        <Button variant="primary" onClick={onNext}>Done Capturing →</Button>
      </div>

      {/* Modals */}
      <CaptureTaskModal    open={modal === 'task'}    onClose={() => setModal(null)} onCreate={handleCreateTask}    />
      <CaptureProjectModal open={modal === 'project'} onClose={() => setModal(null)} onCreate={handleCreateProject} />
      <CapturePersonModal  open={modal === 'person'}  onClose={() => setModal(null)} onCreate={handleCreatePerson}  />
      <QuickNoteModal      open={modal === 'note'}    onClose={() => setModal(null)} onAdd={handleAddNote}          />
    </div>
  )
}

// ─── STEP 2: CLARIFY ──────────────────────────────────────────────────────────

function ClarifyStep({ onNext, onBack }) {
  const today = new Date().toISOString().split('T')[0]
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
          supabase.from('tasks').select('id, title, due_date').eq('status', 'inbox').is('archived_at', null).order('created_at', { ascending: false }),
          supabase.from('projects').select('id, title').eq('status', 'inbox').is('archived_at', null).order('created_at', { ascending: false }),
          supabase.from('people').select('id, first_name, last_name').eq('status', 'inbox').order('last_name', { ascending: true }),
          supabase.from('tasks').select('id, project_id').in('status', ['next_action', 'waiting', 'scheduled', 'queued']).is('archived_at', null),
        ])

        const activeProjectIds = new Set((activeTasksRes.data ?? []).filter(t => t.project_id).map(t => t.project_id))

        const stalledRes = await supabase
          .from('projects')
          .select('id, title')
          .eq('status', 'in_progress')
          .is('archived_at', null)

        const overdueRes = await supabase
          .from('tasks')
          .select('id, title, due_date')
          .in('status', ['next_action', 'waiting', 'scheduled', 'queued'])
          .lt('due_date', today)
          .is('archived_at', null)
          .order('due_date', { ascending: true })

        setInboxTasks(tasksRes.data ?? [])
        setInboxProjects(projectsRes.data ?? [])
        setInboxPeople(peopleRes.data ?? [])
        setStalled((stalledRes.data ?? []).filter(p => !activeProjectIds.has(p.id)))
        setOverdue(overdueRes.data ?? [])
      } catch (err) {
        console.error('ClarifyStep load error:', err)
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

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <p className="text-sm" style={S.muted}>Loading…</p>
    </div>
  )

  const allEmpty = !inboxTasks.length && !inboxProjects.length && !inboxPeople.length && !stalled.length && !overdue.length

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={S.muted}>Step 2 of 3</p>
        <h2 className="text-2xl font-semibold mb-2" style={S.text}>What does each item mean?</h2>
        <p className="text-sm" style={S.muted}>Open each item to clarify it on its detail page. Mark done when sorted, scrap if it's noise.</p>
      </div>

      {allEmpty ? (
        <div className="rounded-xl border p-8 text-center" style={S.card}>
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-sm font-medium" style={S.green}>All clear — nothing to clarify.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inboxTasks.length > 0 && (
            <div className="rounded-xl border p-4" style={S.card}>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={S.blue}>📥 Inbox Tasks</h3>
              {inboxTasks.map(item => (
                <ClarifyRow
                  key={item.id}
                  item={item}
                  linkTo={`/tasks/${item.id}`}
                  onDone={() => updateTask(item.id, { status: 'done' })}
                  onScrap={() => updateTask(item.id, { archived_at: new Date().toISOString() })}
                />
              ))}
            </div>
          )}

          {inboxProjects.length > 0 && (
            <div className="rounded-xl border p-4" style={S.card}>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={S.purple}>📥 Inbox Projects</h3>
              {inboxProjects.map(item => (
                <ClarifyRow
                  key={item.id}
                  item={item}
                  linkTo={`/projects/${item.id}`}
                  onDone={() => updateProject(item.id, { status: 'completed' })}
                  onScrap={() => updateProject(item.id, { archived_at: new Date().toISOString() })}
                />
              ))}
            </div>
          )}

          {inboxPeople.length > 0 && (
            <div className="rounded-xl border p-4" style={S.card}>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--accent-green)' }}>👤 Inbox People</h3>
              {inboxPeople.map(item => (
                <ClarifyRow
                  key={item.id}
                  item={item}
                  linkTo={`/people/${item.id}`}
                  onDone={() => updatePerson(item.id, { status: 'active' })}
                  onScrap={() => updatePerson(item.id, { status: 'stale' })}
                />
              ))}
            </div>
          )}

          {stalled.length > 0 && (
            <div className="rounded-xl border p-4" style={S.card}>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-1" style={S.yellow}>⚠️ Stalled Projects</h3>
              <p className="text-xs mb-3" style={S.muted}>In progress with no active tasks</p>
              {stalled.map(item => (
                <ClarifyRow
                  key={item.id}
                  item={item}
                  linkTo={`/projects/${item.id}`}
                  onDone={() => updateProject(item.id, { status: 'in_progress' })}
                  onScrap={() => updateProject(item.id, { archived_at: new Date().toISOString() })}
                />
              ))}
            </div>
          )}

          {overdue.length > 0 && (
            <div className="rounded-xl border p-4" style={S.card}>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-1" style={S.red}>🔴 Overdue Tasks</h3>
              <p className="text-xs mb-3" style={S.muted}>Past due date, not completed</p>
              {overdue.map(item => (
                <ClarifyRow
                  key={item.id}
                  item={item}
                  linkTo={`/tasks/${item.id}`}
                  meta={daysDiff(item.due_date)}
                  onDone={() => updateTask(item.id, { status: 'done' })}
                  onScrap={() => updateTask(item.id, { archived_at: new Date().toISOString() })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-6 mt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <Button variant="primary" onClick={onNext}>Done Clarifying →</Button>
      </div>
    </div>
  )
}

// ─── STEP 3: REFLECT ─────────────────────────────────────────────────────────

function ReflectStep({ review, onComplete, onBack }) {
  const { configured: aiConfigured, loading: aiLoading } = useAIConfig()
  const aiConfiguredRef = useRef(false)
  useEffect(() => { aiConfiguredRef.current = aiConfigured }, [aiConfigured])
  const [ctx,          setCtx]          = useState(null)
  const [questions,    setQuestions]    = useState([])
  const [conversation, setConversation] = useState([])
  const [qIndex,       setQIndex]       = useState(0)
  const [typing,       setTyping]       = useState(false)
  const [inputVal,     setInputVal]     = useState('')
  const [inputActive,  setInputActive]  = useState(false)
  const [scratchpad,   setScratchpad]   = useState('')
  const [showScratch,  setShowScratch]  = useState(false)
  const [generating,   setGenerating]   = useState(false)
  const [suggestions,  setSuggestions]  = useState(review?.suggestions ?? [])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [completed,    setCompleted]    = useState(review?.status === 'completed')
  const [nextActions,  setNextActions]  = useState([])
  const [inProgress,   setInProgress]   = useState([])
  const chatRef = useRef(null)
  const inputRef = useRef(null)

  const scrollChat = () => setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }), 50)

  const addBubble = useCallback((role, content) => {
    setConversation(prev => [...prev, { role, content }])
    scrollChat()
  }, [])

  const askQuestion = useCallback((q) => {
    setTyping(true)
    setInputActive(false)
    setTimeout(() => {
      setTyping(false)
      addBubble('ai', q)
      setInputActive(true)
      setTimeout(() => inputRef.current?.focus(), 50)
    }, 1200)
  }, [addBubble])

  // Load context + reference lists on mount
  useEffect(() => {
    async function init() {
      const [ctxData, nextRes, projRes] = await Promise.all([
        buildReflectContext(),
        supabase.from('tasks').select('id, title, due_date').eq('status', 'next_action').is('archived_at', null).limit(8),
        supabase.from('projects').select('id, title, status').eq('status', 'in_progress').is('archived_at', null).limit(6),
      ])
      setCtx(ctxData)
      setNextActions(nextRes.data ?? [])
      setInProgress(projRes.data ?? [])

      if (review?.status === 'completed') return

      setTyping(true)
      setTimeout(async () => {
        if (aiConfiguredRef.current) {
          try {
            const qs = await generateReflectQuestions(ctxData)
            setQuestions(qs)
            setTyping(false)
            addBubble('ai', qs[0])
            setInputActive(true)
            setTimeout(() => inputRef.current?.focus(), 50)
          } catch {
            setTyping(false)
            addBubble('ai', "Let's talk about your day. What was your biggest win today?")
            setInputActive(true)
          }
        } else {
          setTyping(false)
          addBubble('ai', "Set up an AI provider in <a href='/settings' style='color:var(--accent);text-decoration:underline;'>Settings</a> to enable the AI interview. You can still complete the review below.")
        }
      }, 1500)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      const { suggestions: newSuggestions } = await writeReflectResults(review.id, result)
      setSuggestions(newSuggestions)
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        addBubble('ai', `✨ Tomorrow's plan is set for <strong>${new Date(new Date().toISOString().split('T')[0] + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong>. Top of mind, agenda, and challenge are written to your Daily page. Review the suggestions below when you complete.`)
      }, 800)
    } catch (err) {
      addBubble('ai', `Something went wrong generating the plan: ${err.message}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleComplete = async () => {
    if (!review?.id) return
    await completeReview(review.id)
    setCompleted(true)
    setShowSuggestions(true)
    onComplete()
  }

  const handleSuggestionChange = async (updated) => {
    setSuggestions(updated)
    if (review?.id) await updateSuggestions(review.id, updated)
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={S.muted}>Step 3 of 3</p>
        <h2 className="text-2xl font-semibold mb-2" style={S.text}>Let's talk about your day.</h2>
        <p className="text-sm" style={S.muted}>
          {aiConfigured
            ? "The AI has read your tasks, projects, habits, and last 30 days of notes. Answer honestly — it's using everything."
            : "Reflect on your day and complete your review."}
        </p>
      </div>

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

      {/* Chat window */}
      <div
        ref={chatRef}
        className="rounded-xl border p-4 space-y-3 overflow-y-auto"
        style={{ ...S.card, minHeight: 120, maxHeight: 420 }}
      >
        <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }`}</style>
        {conversation.map((msg, i) => (
          <Bubble key={i} role={msg.role}>{msg.content}</Bubble>
        ))}
        {typing && <TypingIndicator />}
      </div>

      {/* Chat input */}
      {inputActive && !completed && (
        <div className="flex gap-2 mt-3">
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
        <div className="rounded-xl border p-4 mt-3" style={S.card}>
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
        <Button variant="action" size="md" onClick={handleGenerate} disabled={generating} className="w-full mt-3">
          ✨ Generate Tomorrow's Plan
        </Button>
      )}
      {generating && (
        <div className="text-center py-3">
          <p className="text-sm" style={S.muted}>Generating your plan…</p>
        </div>
      )}

      {/* Suggestions — shown after complete */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="mt-4 space-y-3">
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
      <div className="flex items-center justify-between pt-6 mt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <Button variant="ghost" onClick={onBack}>← Back</Button>
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
  const today = new Date().toISOString().split('T')[0]

  const activeType = ['daily', 'weekly', 'monthly'].includes(urlType) ? urlType : 'daily'

  const [step,        setStep]        = useState(0)
  const [review,      setReview]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [todayNoteId, setTodayNoteId] = useState(null)

  useEffect(() => {
    setStep(0)
    setLoading(true)
    Promise.all([
      ensureReview(activeType, today),
      supabase.from('daily_notes').select('id').eq('date', today).maybeSingle(),
    ]).then(([r, noteRes]) => {
      setReview(r)
      setTodayNoteId(noteRes.data?.id ?? null)
    }).catch(err => {
      console.error('Reviews load error:', err)
    }).finally(() => {
      setLoading(false)
    })
  }, [activeType, today])

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
        <p className="text-sm" style={S.muted}>
          {new Date(today + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
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

      {/* Step bar — daily only */}
      {activeType === 'daily' && (
        <StepBar current={step} onNavigate={i => i < step && setStep(i)} />
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={S.muted}>Loading…</p>
          </div>
        ) : activeType === 'daily' ? (
          <>
            {step === 0 && <CaptureStep onNext={() => setStep(1)} todayNoteId={todayNoteId} />}
            {step === 1 && <ClarifyStep onNext={() => setStep(2)} onBack={() => setStep(0)} />}
            {step === 2 && <ReflectStep review={review} onComplete={() => {}} onBack={() => setStep(1)} />}
          </>
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
