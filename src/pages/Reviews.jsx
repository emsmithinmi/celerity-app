import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Check, CheckCheck, Zap, CalendarDays, Folder, Clock, Trash2, AlertCircle,
  X, ListPlus, Play, Send, Loader2, RotateCcw, ChevronDown, ChevronUp,
  Briefcase, Star,
} from 'lucide-react'
import { createReview, updateReviewContent, completeReview } from '../lib/api/reviews'
import {
  buildReflectContext, generateReviewOpening, generateConversationalResponse,
  generateReflectPlan, writeReflectResults,
} from '../lib/ai/skills/reflectReview'
import { useAIConfig } from '../hooks/useAI'
import { useEnergyLevels } from '../contexts/EnergyLevelsContext'
import { usePriorities }   from '../contexts/PrioritiesContext'
import { useAreas }        from '../contexts/AreasContext'
import { useTasks }        from '../hooks/useTasks'
import { useProjects }     from '../hooks/useProjects'
import { usePeople }       from '../hooks/usePeople'
import { createTask, updateTask, completeTaskWithOptions } from '../lib/api/tasks'
import { updateProject }   from '../lib/api/projects'
import { createPerson }    from '../lib/api/people'
import { supabase }        from '../lib/supabase'
import {
  CaptureTaskModal,
  CaptureProjectModal,
  CapturePersonModal,
} from '../components/daily/QuickCaptureModals'
import Button    from '../components/ui/Button'
import ActionBtn from '../components/ui/ActionBtn'
import { EmptyState } from '../components/ui'
import TaskCompletionModal from '../components/tasks/TaskCompletionModal'

// ─── Style constants ──────────────────────────────────────────────────────────

const S = {
  card:   { backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' },
  input:  { backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' },
  muted:  { color: 'var(--text-secondary)' },
  text:   { color: 'var(--text-primary)' },
  blue:   { color: 'var(--accent)' },
  green:  { color: 'var(--accent-green)' },
  red:    { color: 'var(--accent-red)' },
  yellow: { color: 'var(--accent-yellow)' },
}

const ALL_TASK_STATUSES    = ['inbox', 'next_action', 'queued', 'waiting', 'scheduled', 'someday']
const ALL_PROJECT_STATUSES = ['inbox', 'planning', 'in_progress', 'waiting', 'stalled']

// ─── Task inline action row ───────────────────────────────────────────────────

function ReviewTaskRow({ task }) {
  const { levels }     = useEnergyLevels()
  const { priorities } = usePriorities()
  const { areas }      = useAreas()

  const [resolved,        setResolved]        = useState(false)
  const [resolvedLabel,   setResolvedLabel]   = useState('')
  const [showCompletion,  setShowCompletion]  = useState(false)
  const [prompt,          setPrompt]          = useState(null)
  const [promptValue,     setPromptValue]     = useState('')
  const [projects,        setProjects]        = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [saving,          setSaving]          = useState(false)
  const [clarifyFields,   setClarifyFields]   = useState({
    description:  task.description  ?? '',
    priority:     task.priority     ?? '',
    energy_level: task.energy_level ?? '',
    duration:     task.duration     ?? '',
    area:         task.area         ?? '',
  })

  const rowRef = useRef(null)
  useEffect(() => {
    if (prompt === 'clarify') setTimeout(() => rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80)
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
        <span className="flex-1 text-sm truncate line-through" style={S.muted}>{task.title}</span>
        <span className="text-xs shrink-0" style={S.green}>{resolvedLabel}</span>
      </div>
    )
  }

  const status = task.status

  return (
    <div ref={rowRef} className="rounded-lg border mb-1.5 overflow-hidden" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <span className="flex-1 text-sm font-medium truncate" style={S.text}>{task.title}</span>
        {task.due_date && <span className="text-xs shrink-0" style={S.yellow}>{task.due_date}</span>}
        <span className="text-xs shrink-0 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--border)', ...S.muted }}>{status}</span>
        <Link to={`/tasks/${task.id}`} className="text-xs shrink-0 hover:underline" style={S.muted}>open →</Link>
      </div>

      {/* Inline prompts */}
      {prompt === 'schedule' && (
        <div className="px-3 pb-2.5 flex items-center gap-2">
          <input type="date" value={promptValue} onChange={e => setPromptValue(e.target.value)} autoFocus
            className="flex-1 px-2 py-1 rounded border text-xs outline-none" style={S.input} />
          <ActionBtn variant="warning" title="Confirm" disabled={!promptValue || saving}
            onClick={() => resolve(() => updateTask(task.id, { status: 'scheduled', due_date: promptValue }), 'Scheduled').then(() => setPrompt(null))}>
            <Check size={13} />
          </ActionBtn>
          <ActionBtn variant="ghost" title="Cancel" onClick={() => setPrompt(null)}><X size={13} /></ActionBtn>
        </div>
      )}
      {prompt === 'waiting' && (
        <div className="px-3 pb-2.5 flex items-center gap-2">
          <input type="text" value={promptValue} onChange={e => setPromptValue(e.target.value)}
            placeholder="What's blocking this?" autoFocus
            className="flex-1 px-2 py-1 rounded border text-xs outline-none" style={S.input}
            onKeyDown={e => e.key === 'Enter' && promptValue.trim() &&
              resolve(() => updateTask(task.id, { status: 'waiting', waiting_for: promptValue.trim() }), 'Waiting').then(() => setPrompt(null))} />
          <ActionBtn variant="danger" title="Confirm" disabled={!promptValue.trim() || saving}
            onClick={() => resolve(() => updateTask(task.id, { status: 'waiting', waiting_for: promptValue.trim() }), 'Waiting').then(() => setPrompt(null))}>
            <Check size={13} />
          </ActionBtn>
          <ActionBtn variant="ghost" title="Cancel" onClick={() => setPrompt(null)}><X size={13} /></ActionBtn>
        </div>
      )}
      {prompt === 'clarify' && (
        <div className="px-3 pb-3 space-y-2 rounded-b-lg" style={{ backgroundColor: 'var(--card-task-bg)', borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold pt-2" style={S.blue}>⚡ Fill in the details</p>
          <textarea autoFocus rows={2} placeholder="What does this task actually involve?"
            value={clarifyFields.description} onChange={e => setClarifyFields(f => ({ ...f, description: e.target.value }))}
            className="w-full px-2 py-1.5 rounded border text-xs outline-none resize-none" style={S.input} />
          <div className="grid grid-cols-2 gap-2">
            <select value={clarifyFields.priority} onChange={e => setClarifyFields(f => ({ ...f, priority: e.target.value }))}
              className="px-2 py-1.5 rounded border text-xs outline-none" style={{ ...S.input, color: clarifyFields.priority ? 'var(--text-primary)' : 'var(--text-dim)' }}>
              <option value="">Priority…</option>
              {priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select value={clarifyFields.energy_level} onChange={e => setClarifyFields(f => ({ ...f, energy_level: e.target.value }))}
              className="px-2 py-1.5 rounded border text-xs outline-none" style={{ ...S.input, color: clarifyFields.energy_level ? 'var(--text-primary)' : 'var(--text-dim)' }}>
              <option value="">Energy…</option>
              {levels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <input type="number" min="1" placeholder="Duration (min)" value={clarifyFields.duration}
              onChange={e => setClarifyFields(f => ({ ...f, duration: e.target.value }))}
              className="px-2 py-1.5 rounded border text-xs outline-none" style={S.input} />
            <input list={`area-list-${task.id}`} placeholder="Area…" value={clarifyFields.area}
              onChange={e => setClarifyFields(f => ({ ...f, area: e.target.value }))}
              className="px-2 py-1.5 rounded border text-xs outline-none" style={S.input} />
            <datalist id={`area-list-${task.id}`}>{areas.map(a => <option key={a.id} value={a.label} />)}</datalist>
          </div>
          <div className="flex gap-2">
            <ActionBtn variant="primary" title="Send to Next Actions" disabled={!clarifyReady || saving} onClick={handleClarifyConfirm}><Check size={13} /></ActionBtn>
            <ActionBtn variant="ghost" title="Cancel" onClick={() => setPrompt(null)}><X size={13} /></ActionBtn>
          </div>
        </div>
      )}
      {prompt === 'route' && (
        <div className="px-3 pb-2.5 space-y-1.5">
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {projects.length === 0
              ? <p className="text-xs" style={S.muted}>No active projects found.</p>
              : projects.map(p => (
                <button key={p.id} onClick={() => setSelectedProject(p.id)}
                  className="w-full text-left px-2 py-1.5 rounded border text-xs"
                  style={{ backgroundColor: selectedProject === p.id ? 'var(--border)' : 'transparent', borderColor: selectedProject === p.id ? 'var(--accent)' : 'var(--border)', ...S.text }}>
                  {p.title}
                </button>
              ))
            }
          </div>
          <div className="flex gap-2">
            <ActionBtn variant="primary" title="Queue it" disabled={!selectedProject || saving}
              onClick={() => resolve(() => updateTask(task.id, { status: 'queued', project_id: selectedProject }), 'Queued').then(() => setPrompt(null))}>
              <Check size={13} />
            </ActionBtn>
            <ActionBtn variant="ghost" title="Cancel" onClick={() => setPrompt(null)}><X size={13} /></ActionBtn>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!prompt && (
        <div className="px-3 pb-2.5 flex flex-wrap gap-1">
          {status === 'inbox' && !task.project_id && (
            <>
              <ActionBtn variant="danger"    title="Did It"              onClick={() => setShowCompletion(true)}><CheckCheck size={13} /></ActionBtn>
              <ActionBtn variant="success"   title="Next Action"         onClick={() => openPrompt('clarify')}><Zap size={13} /></ActionBtn>
              <ActionBtn variant="warning"   title="Schedule it"         onClick={() => openPrompt('schedule')}><CalendarDays size={13} /></ActionBtn>
              <ActionBtn variant="secondary" title="Assign to project"   onClick={() => openPrompt('route')}><Folder size={13} /></ActionBtn>
              <ActionBtn variant="ghost"     title="Someday/Maybe"       onClick={() => resolve(() => updateTask(task.id, { status: 'someday' }), 'Someday')}><Clock size={13} /></ActionBtn>
              <ActionBtn variant="ghost"     title="Scrap it"            onClick={() => resolve(() => updateTask(task.id, { archived_at: new Date().toISOString() }), 'Scrapped')}><Trash2 size={13} /></ActionBtn>
            </>
          )}
          {status === 'inbox' && task.project_id && (
            <>
              <ActionBtn variant="danger"    title="Did It"          onClick={() => setShowCompletion(true)}><CheckCheck size={13} /></ActionBtn>
              <ActionBtn variant="secondary" title="Queue it"        onClick={() => resolve(() => updateTask(task.id, { status: 'queued' }), 'Queued')}><ListPlus size={13} /></ActionBtn>
              <ActionBtn variant="warning"   title="Schedule it"     onClick={() => openPrompt('schedule')}><CalendarDays size={13} /></ActionBtn>
              <ActionBtn variant="ghost"     title="Someday/Maybe"   onClick={() => resolve(() => updateTask(task.id, { status: 'someday' }), 'Someday')}><Clock size={13} /></ActionBtn>
              <ActionBtn variant="ghost"     title="Scrap it"        onClick={() => resolve(() => updateTask(task.id, { archived_at: new Date().toISOString() }), 'Scrapped')}><Trash2 size={13} /></ActionBtn>
            </>
          )}
          {status === 'next_action' && (
            <>
              <ActionBtn variant="danger"  title="Did It"          onClick={() => setShowCompletion(true)}><CheckCheck size={13} /></ActionBtn>
              <ActionBtn variant="warning" title="There's a holdup" onClick={() => openPrompt('waiting')}><AlertCircle size={13} /></ActionBtn>
              <ActionBtn variant="warning" title="Schedule it"      onClick={() => openPrompt('schedule')}><CalendarDays size={13} /></ActionBtn>
              <ActionBtn variant="ghost"   title="Scrap it"         onClick={() => resolve(() => updateTask(task.id, { archived_at: new Date().toISOString() }), 'Scrapped')}><Trash2 size={13} /></ActionBtn>
            </>
          )}
          {status === 'queued' && (
            <>
              <ActionBtn variant="danger"  title="Did It"           onClick={() => setShowCompletion(true)}><CheckCheck size={13} /></ActionBtn>
              <ActionBtn variant="success" title="Move to Next Action" onClick={() => resolve(() => updateTask(task.id, { status: 'next_action' }), 'Next Action')}><Zap size={13} /></ActionBtn>
            </>
          )}
          {status === 'waiting' && (
            <>
              <ActionBtn variant="danger"  title="Did It"            onClick={() => setShowCompletion(true)}><CheckCheck size={13} /></ActionBtn>
              <ActionBtn variant="success" title="Clear blocker"     onClick={() => resolve(() => updateTask(task.id, { status: 'next_action', waiting_for: null }), 'Unblocked')}><Play size={13} /></ActionBtn>
            </>
          )}
          {status === 'scheduled' && (
            <ActionBtn variant="danger" title="Did It" onClick={() => setShowCompletion(true)}><CheckCheck size={13} /></ActionBtn>
          )}
          {status === 'someday' && (
            <>
              <ActionBtn variant="success" title="Move to Next Action" onClick={() => resolve(() => updateTask(task.id, { status: 'next_action' }), 'Next Action')}><Zap size={13} /></ActionBtn>
              <ActionBtn variant="ghost"   title="Scrap it"            onClick={() => resolve(() => updateTask(task.id, { archived_at: new Date().toISOString() }), 'Scrapped')}><Trash2 size={13} /></ActionBtn>
            </>
          )}
        </div>
      )}

      <TaskCompletionModal
        open={showCompletion}
        onClose={() => setShowCompletion(false)}
        onConfirm={async (opts) => {
          await resolve(() => completeTaskWithOptions(task.id, opts), opts.archive ? 'Archived' : opts.highlight ? 'Highlighted ⭐' : 'Done')
          setShowCompletion(false)
        }}
      />
    </div>
  )
}

// ─── Project inline action row ────────────────────────────────────────────────

const PROJECT_STATUS_LABELS = {
  inbox: 'Inbox', planning: 'Planning', in_progress: 'In Progress',
  waiting: 'Waiting', stalled: 'Stalled',
}

function ReviewProjectRow({ project }) {
  const [resolved, setResolved]       = useState(false)
  const [resolvedLabel, setResolvedLabel] = useState('')
  const [saving, setSaving]           = useState(false)

  const resolve = async (fn, label) => {
    setSaving(true)
    try { await fn() } finally { setSaving(false) }
    setResolvedLabel(label)
    setResolved(true)
  }

  if (resolved) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border mb-1.5 opacity-40" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--accent-green)33' }}>
        <span className="flex-1 text-sm truncate line-through" style={S.muted}>{project.title}</span>
        <span className="text-xs shrink-0" style={S.green}>{resolvedLabel}</span>
      </div>
    )
  }

  const s = project.status

  return (
    <div className="rounded-lg border mb-1.5 overflow-hidden" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="flex-1 text-sm font-medium truncate" style={S.text}>{project.title}</span>
        {project.end_date && <span className="text-xs shrink-0" style={S.muted}>through {project.end_date}</span>}
        <span className="text-xs shrink-0 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--border)', ...S.muted }}>{PROJECT_STATUS_LABELS[s] ?? s}</span>
        <Link to={`/projects/${project.id}`} className="text-xs shrink-0 hover:underline" style={S.muted}>open →</Link>
      </div>
      <div className="px-3 pb-2.5 flex flex-wrap gap-1">
        {(s === 'inbox' || s === 'planning') && (
          <ActionBtn variant="success" title="Start it" disabled={saving}
            onClick={() => resolve(() => updateProject(project.id, { status: 'in_progress' }), 'Started')}>
            <Play size={13} />
          </ActionBtn>
        )}
        {(s === 'in_progress' || s === 'waiting' || s === 'stalled') && (
          <ActionBtn variant="danger" title="Complete it" disabled={saving}
            onClick={() => resolve(() => updateProject(project.id, { status: 'completed' }), 'Completed')}>
            <CheckCheck size={13} />
          </ActionBtn>
        )}
        {s === 'in_progress' && (
          <>
            <ActionBtn variant="warning" title="Waiting on something" disabled={saving}
              onClick={() => resolve(() => updateProject(project.id, { status: 'waiting' }), 'Waiting')}>
              <AlertCircle size={13} />
            </ActionBtn>
            <ActionBtn variant="ghost" title="Mark stalled" disabled={saving}
              onClick={() => resolve(() => updateProject(project.id, { status: 'stalled' }), 'Stalled')}>
              <Clock size={13} />
            </ActionBtn>
          </>
        )}
        {(s === 'waiting' || s === 'stalled') && (
          <ActionBtn variant="success" title="Back to In Progress" disabled={saving}
            onClick={() => resolve(() => updateProject(project.id, { status: 'in_progress' }), 'In Progress')}>
            <Zap size={13} />
          </ActionBtn>
        )}
        <ActionBtn variant="ghost" title="Scrap it" disabled={saving}
          onClick={() => resolve(() => updateProject(project.id, { archived_at: new Date().toISOString() }), 'Scrapped')}>
          <Trash2 size={13} />
        </ActionBtn>
      </div>
    </div>
  )
}

// ─── Person inline action row ─────────────────────────────────────────────────

function ReviewPersonRow({ person, onFollowUp }) {
  const [resolved, setResolved]           = useState(false)
  const [resolvedLabel, setResolvedLabel] = useState('')

  if (resolved) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border mb-1.5 opacity-40" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--accent-green)33' }}>
        <span className="flex-1 text-sm truncate line-through" style={S.muted}>{person.first_name} {person.last_name}</span>
        <span className="text-xs shrink-0" style={S.green}>{resolvedLabel}</span>
      </div>
    )
  }

  const name = person.preferred_name || `${person.first_name} ${person.last_name}`

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border mb-1.5" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)' }}>
      <span className="flex-1 text-sm font-medium truncate" style={S.text}>{name}</span>
      {person.relationship && <span className="text-xs shrink-0" style={S.muted}>{person.relationship}</span>}
      <Link to={`/people/${person.id}`} className="text-xs shrink-0 hover:underline" style={S.muted}>open →</Link>
      <div className="flex gap-1 shrink-0">
        <ActionBtn variant="secondary" title="Create follow-up task"
          onClick={() => { onFollowUp(person); setResolved(true); setResolvedLabel('Follow-up') }}>
          <ListPlus size={13} />
        </ActionBtn>
      </div>
    </div>
  )
}

// ─── Email row ────────────────────────────────────────────────────────────────

function EmailRow({ thread, onCreateTask, onCreateProject, onCreatePerson }) {
  const [acted, setActed]     = useState(false)
  const [actedLabel, setActedLabel] = useState('')

  const senderName = thread.sender?.replace(/<.*>/, '').trim() || thread.sender
  const dateStr = thread.date ? new Date(thread.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

  if (acted) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border mb-1.5 opacity-40" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--accent-green)33' }}>
        <span className="flex-1 text-sm truncate line-through" style={S.muted}>{thread.subject}</span>
        <span className="text-xs shrink-0" style={S.green}>{actedLabel}</span>
      </div>
    )
  }

  return (
    <div className="rounded-lg border mb-1.5 overflow-hidden" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        {thread.starred && <Star size={12} style={{ color: 'var(--accent-yellow)', flexShrink: 0 }} title="Work email" fill="currentColor" />}
        <span className="flex-1 text-sm font-medium truncate" style={S.text}>{thread.subject}</span>
        <span className="text-xs shrink-0" style={S.muted}>{senderName}</span>
        <span className="text-xs shrink-0 ml-1" style={S.muted}>{dateStr}</span>
      </div>
      <div className="px-3 pb-2 flex gap-1">
        <ActionBtn variant="success" title="Create Task"
          onClick={() => { onCreateTask(thread); setActed(true); setActedLabel('→ Task') }}>
          <CheckCheck size={13} />
        </ActionBtn>
        <ActionBtn variant="secondary" title="Create Project"
          onClick={() => { onCreateProject(thread); setActed(true); setActedLabel('→ Project') }}>
          <Folder size={13} />
        </ActionBtn>
        <ActionBtn variant="ghost" title="Create Person"
          onClick={() => { onCreatePerson(thread); setActed(true); setActedLabel('→ Person') }}>
          <Briefcase size={13} />
        </ActionBtn>
      </div>
    </div>
  )
}

// ─── Email feed ───────────────────────────────────────────────────────────────

async function fetchEmailThreads(session) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const res = await fetch(`${supabaseUrl}/functions/v1/gmail-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.error === 'no_integration') return null
    return data
  } catch { return null }
}

function EmailFeed({ onCreateTask, onCreateProject, onCreatePerson }) {
  const [tab, setTab]         = useState('action')
  const [emails, setEmails]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      fetchEmailThreads(session)
        .then(data => setEmails(data))
        .finally(() => setLoading(false))
    })
  }, [])

  const tabs = [
    { key: 'action',  label: 'Action',  threads: emails?.actionThreads  ?? [] },
    { key: 'waiting', label: 'Waiting', threads: emails?.waitingThreads ?? [] },
    { key: 'new',     label: 'New',     threads: emails?.recentUnread   ?? [] },
  ]
  const activeThreads = tabs.find(t => t.key === tab)?.threads ?? []

  if (!loading && !emails) return null  // no integration, skip section

  return (
    <div className="rounded-xl border overflow-hidden mb-4" style={S.card}>
      <button
        className="w-full flex items-center justify-between px-4 py-3"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-sm font-semibold" style={S.text}>✉️ Email</span>
        <div className="flex items-center gap-2">
          {!loading && emails && (
            <span className="text-xs" style={S.muted}>
              {(emails.actionThreads?.length ?? 0) + (emails.waitingThreads?.length ?? 0)} pending
            </span>
          )}
          {open ? <ChevronUp size={14} style={S.muted} /> : <ChevronDown size={14} style={S.muted} />}
        </div>
      </button>

      {open && (
        <div className="border-t px-4 pb-4" style={{ borderColor: 'var(--border)' }}>
          {/* Tabs */}
          <div className="flex gap-1 pt-3 pb-3">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium"
                style={{ backgroundColor: tab === t.key ? 'var(--border)' : 'transparent', color: tab === t.key ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {t.label}
                {t.threads.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: tab === t.key ? 'var(--text-secondary)' : 'var(--border)', color: tab === t.key ? 'var(--pane-bg)' : 'var(--text-secondary)' }}>
                    {t.threads.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-xs py-2" style={S.muted}>Loading emails…</p>
          ) : activeThreads.length === 0 ? (
            <p className="text-xs py-2" style={S.muted}>Nothing here.</p>
          ) : (
            activeThreads.map(t => (
              <EmailRow key={t.id} thread={t}
                onCreateTask={onCreateTask}
                onCreateProject={onCreateProject}
                onCreatePerson={onCreatePerson}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Calendar strip ───────────────────────────────────────────────────────────

function CalendarStrip() {
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)
  const [open,    setOpen]    = useState(true)

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA')
    const end   = new Date()
    end.setDate(end.getDate() + 4)
    const endStr = end.toLocaleDateString('en-CA')

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const res = await fetch(`${supabaseUrl}/functions/v1/google-calendar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ date: today, endDate: endStr }),
        })
        if (!res.ok) return
        const { events: evts } = await res.json()
        setEvents(evts ?? [])
      } catch { /* silent */ } finally { setLoading(false) }
    })
  }, [])

  if (!loading && events.length === 0) return null

  const byDate = events.reduce((acc, e) => {
    const d = e.date ?? e.start_time?.slice(0, 10)
    if (!d) return acc
    if (!acc[d]) acc[d] = []
    acc[d].push(e)
    return acc
  }, {})

  return (
    <div className="rounded-xl border overflow-hidden mb-4" style={S.card}>
      <button className="w-full flex items-center justify-between px-4 py-3" onClick={() => setOpen(o => !o)}>
        <span className="text-sm font-semibold" style={S.text}>📅 Upcoming</span>
        {open ? <ChevronUp size={14} style={S.muted} /> : <ChevronDown size={14} style={S.muted} />}
      </button>
      {open && (
        <div className="border-t px-4 pb-3" style={{ borderColor: 'var(--border)' }}>
          {loading ? (
            <p className="text-xs py-3" style={S.muted}>Loading calendar…</p>
          ) : (
            Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, evts]) => (
              <div key={date} className="mt-3">
                <p className="text-xs font-semibold mb-1.5" style={S.muted}>
                  {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                {evts.map((e, i) => {
                  const time = e.all_day ? '' : e.start_time
                    ? new Date(e.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                    : ''
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs py-1">
                      {time && <span className="shrink-0 w-16 text-right" style={S.muted}>{time}</span>}
                      <span style={S.text}>{e.summary}</span>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Step 1: Get Current ──────────────────────────────────────────────────────

const CONTENT_TABS = [
  { key: 'tasks',    label: 'Tasks'    },
  { key: 'projects', label: 'Projects' },
  { key: 'people',   label: 'People'   },
]

function GetCurrentStep({ onReady }) {
  const [contentTab, setContentTab] = useState('tasks')
  const [modal, setModal]           = useState(null)   // null | 'task' | 'project' | 'person'
  const [emailPrefill, setEmailPrefill] = useState({}) // prefill from email action

  const { tasks,    loading: tLoading }    = useTasks({ statuses: ALL_TASK_STATUSES })
  const { projects, loading: pjLoading }   = useProjects({ statuses: ALL_PROJECT_STATUSES, archived: false })
  const { people,   loading: peLoading }   = usePeople({ status: 'active' })
  const { createProject }                  = useProjects({ statuses: ALL_PROJECT_STATUSES, archived: false })

  const tabCount = { tasks: tasks.length, projects: projects.length, people: people.length }

  const handleEmailTask    = (thread) => { setEmailPrefill({ title: thread.subject }); setModal('task') }
  const handleEmailProject = (thread) => { setEmailPrefill({ title: thread.subject }); setModal('project') }
  const handleEmailPerson  = (thread) => { setEmailPrefill({ first_name: thread.sender?.replace(/<.*>/, '').trim() }); setModal('person') }
  const handleFollowUp     = (person) => { setEmailPrefill({ title: `Follow up with ${person.preferred_name || person.first_name}` }); setModal('task') }

  return (
    <div className="px-6 py-5">
      {/* Email feed */}
      <EmailFeed
        onCreateTask={handleEmailTask}
        onCreateProject={handleEmailProject}
        onCreatePerson={handleEmailPerson}
      />

      {/* Calendar strip */}
      <CalendarStrip />

      {/* Content tabs: Tasks / Projects / People */}
      <div className="rounded-xl border overflow-hidden mb-5" style={S.card}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-1">
            {CONTENT_TABS.map(t => (
              <button key={t.key} onClick={() => setContentTab(t.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ backgroundColor: contentTab === t.key ? 'var(--border)' : 'transparent', color: contentTab === t.key ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {t.label}
                {tabCount[t.key] > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: contentTab === t.key ? 'var(--text-secondary)' : 'var(--border)', color: contentTab === t.key ? 'var(--pane-bg)' : 'var(--text-secondary)' }}>
                    {tabCount[t.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <Button size="sm" variant="secondary" onClick={() => setModal(contentTab === 'tasks' ? 'task' : contentTab === 'projects' ? 'project' : 'person')}>
            + Add
          </Button>
        </div>

        <div className="p-4">
          {contentTab === 'tasks' && (
            tLoading ? <EmptyState message="Loading…" /> :
            tasks.length === 0 ? <EmptyState message="No active tasks." variant="card" /> :
            tasks.map(t => <ReviewTaskRow key={t.id} task={t} />)
          )}
          {contentTab === 'projects' && (
            pjLoading ? <EmptyState message="Loading…" /> :
            projects.length === 0 ? <EmptyState message="No active projects." variant="card" /> :
            projects.map(p => <ReviewProjectRow key={p.id} project={p} />)
          )}
          {contentTab === 'people' && (
            peLoading ? <EmptyState message="Loading…" /> :
            people.length === 0 ? <EmptyState message="No active people." variant="card" /> :
            people.map(p => <ReviewPersonRow key={p.id} person={p} onFollowUp={handleFollowUp} />)
          )}
        </div>
      </div>

      {/* Ready button */}
      <div className="flex justify-center pt-2">
        <Button variant="primary" onClick={onReady} style={{ padding: '0.625rem 3rem', fontSize: '1rem' }}>
          Ready for Review →
        </Button>
      </div>

      {/* Capture modals */}
      <CaptureTaskModal
        open={modal === 'task'}
        onClose={() => { setModal(null); setEmailPrefill({}) }}
        onCreate={createTask}
        initialValues={emailPrefill}
      />
      <CaptureProjectModal
        open={modal === 'project'}
        onClose={() => { setModal(null); setEmailPrefill({}) }}
        onCreate={createProject}
        initialValues={emailPrefill}
      />
      <CapturePersonModal
        open={modal === 'person'}
        onClose={() => { setModal(null); setEmailPrefill({}) }}
        onCreate={createPerson}
        initialValues={emailPrefill}
      />
    </div>
  )
}

// ─── Chat bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ message }) {
  const isAI = message.role === 'ai'
  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-3`}>
      <div
        className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
        style={isAI
          ? { backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
          : { backgroundColor: 'var(--accent)', color: 'var(--app-bg)' }
        }
      >
        {message.content}
      </div>
    </div>
  )
}

// ─── Step 2: Make a Plan ──────────────────────────────────────────────────────

function MakePlanStep({ reviewId, onSaveConversation, onComplete }) {
  const { configured: aiConfigured, config } = useAIConfig()
  const [conversation, setConversation] = useState([])
  const [input,        setInput]        = useState('')
  const [thinking,     setThinking]     = useState(false)
  const [wrapping,     setWrapping]     = useState(false)
  const [ctx,          setCtx]          = useState(null)
  const mountedRef = useRef(true)
  const scrollRef  = useRef(null)

  useEffect(() => () => { mountedRef.current = false }, [])

  // Scroll to bottom when conversation updates
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation, thinking])

  // Load context and generate opening on mount
  useEffect(() => {
    if (!aiConfigured) return
    let cancelled = false
    setThinking(true)

    buildReflectContext()
      .then(async (context) => {
        if (cancelled || !mountedRef.current) return
        setCtx(context)
        const openingMsg = await generateReviewOpening(context)
        if (cancelled || !mountedRef.current) return
        const opening = { role: 'ai', content: openingMsg }
        setConversation([opening])
        onSaveConversation?.([opening])
        setThinking(false)
      })
      .catch(() => {
        if (!mountedRef.current) return
        const fallback = { role: 'ai', content: "Hey man, I've loaded everything up. What's on your mind?" }
        setConversation([fallback])
        setThinking(false)
      })

    return () => { cancelled = true }
  }, [aiConfigured]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    const text = input.trim()
    if (!text || thinking || wrapping) return
    setInput('')

    const userMsg = { role: 'user', content: text }
    const updated = [...conversation, userMsg]
    setConversation(updated)
    setThinking(true)

    try {
      const dateContext = {
        reviewDate: ctx?.gapEnd,
        planDate:   ctx?.tomorrowStr,
        gapStart:   ctx?.gapStart,
        gapDays:    ctx?.gapDays,
        weekendDays:  ctx?.weekendDays ?? [],
        holidayDays:  ctx?.holidayDays ?? [],
        recentMemories: ctx?.recentMemories ?? [],
      }
      const { message, created = [] } = await generateConversationalResponse(updated, [], dateContext, true)
      if (!mountedRef.current) return

      // Add any DB items the AI created inline
      const aiMsg = { role: 'ai', content: message, created }
      const withAI = [...updated, aiMsg]
      setConversation(withAI)
      onSaveConversation?.(withAI)
    } catch (err) {
      if (!mountedRef.current) return
      const errMsg = { role: 'ai', content: "Something went sideways, man. Try again?" }
      const withErr = [...updated, errMsg]
      setConversation(withErr)
    } finally {
      if (mountedRef.current) setThinking(false)
    }
  }

  const handleWrapUp = async () => {
    if (!ctx || wrapping) return
    setWrapping(true)

    try {
      const result = await generateReflectPlan(ctx, conversation)
      await writeReflectResults(reviewId, result, conversation)
      await completeReview(reviewId)
      if (mountedRef.current) onComplete?.()
    } catch (err) {
      if (mountedRef.current) {
        setWrapping(false)
        const errMsg = { role: 'ai', content: "Hit a snag generating the plan. Give it another shot?" }
        setConversation(c => [...c, errMsg])
      }
    }
  }

  if (!aiConfigured) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center py-24">
        <p className="text-4xl">🤖</p>
        <p className="text-sm" style={S.muted}>AI assistant isn't configured yet. Set it up in Settings → AI Assistant.</p>
        <Button variant="secondary" onClick={() => window.location.href = '/settings'}>Go to Settings</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {conversation.map((m, i) => <ChatBubble key={i} message={m} />)}
        {thinking && (
          <div className="flex justify-start mb-3">
            <div className="px-4 py-2.5 rounded-2xl border text-sm" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              <Loader2 size={14} className="animate-spin inline mr-2" />thinking…
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t px-6 py-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="What's on your mind…"
            disabled={thinking || wrapping}
            className="flex-1 px-4 py-2 rounded-xl border text-sm outline-none"
            style={{ ...S.input, opacity: (thinking || wrapping) ? 0.5 : 1 }}
          />
          <Button variant="primary" onClick={handleSend} disabled={!input.trim() || thinking || wrapping}>
            <Send size={14} />
          </Button>
          <Button variant="action" onClick={handleWrapUp} disabled={thinking || wrapping || conversation.length < 2}>
            {wrapping ? <><Loader2 size={14} className="animate-spin mr-1.5" />Wrapping…</> : '🎯 Wrap it up'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Reviews page ────────────────────────────────────────────────────────

const REVIEW_TYPES = [
  { key: 'daily',   label: '📋 Daily'   },
  { key: 'weekly',  label: '📅 Weekly'  },
  { key: 'monthly', label: '📆 Monthly' },
]

export default function Reviews() {
  const { type = 'daily' } = useParams()
  const navigate = useNavigate()
  const activeType = REVIEW_TYPES.find(r => r.key === type) ? type : 'daily'

  const [started,  setStarted]  = useState(false) // false = landing, true = review in progress
  const [step,     setStep]     = useState(1)   // 1 = Get Current, 2 = Make a Plan
  const [review,   setReview]   = useState(null)
  const [done,     setDone]     = useState(false)
  const [starting, setStarting] = useState(false)

  const today = new Date().toLocaleDateString('en-CA')

  const handleReady = async () => {
    if (starting) return
    setStarting(true)
    try {
      const r = await createReview(activeType, today)
      setReview(r)
      setStep(2)
    } catch (err) {
      console.error('Failed to create review:', err)
    } finally {
      setStarting(false)
    }
  }

  const handleSaveConversation = useCallback(async (conv) => {
    if (!review) return
    try {
      await updateReviewContent(review.id, { conversation: conv })
    } catch { /* non-blocking */ }
  }, [review])

  const handleComplete = () => {
    setDone(true)
  }

  const handleNewReview = () => {
    setStarted(false)
    setStep(1)
    setReview(null)
    setDone(false)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <h1 className="text-xl font-semibold" style={S.text}>Reviews</h1>
        <div className="flex items-center gap-3">
          {step === 2 && (
            <button
              onClick={handleNewReview}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: 'var(--border)', ...S.muted, backgroundColor: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <RotateCcw size={12} /> Back to Step 1
            </button>
          )}
          <p className="text-sm" style={S.muted}>
            {new Date(today + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        {REVIEW_TYPES.map(rt => (
          <button key={rt.key}
            onClick={() => { navigate(`/reviews/${rt.key}`); setStarted(false); setStep(1); setReview(null); setDone(false) }}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ backgroundColor: activeType === rt.key ? 'var(--border)' : 'transparent', color: activeType === rt.key ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            {rt.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {activeType !== 'daily' ? (
          <div className="max-w-2xl mx-auto px-6 py-12 text-center">
            <p className="text-4xl mb-4">🚧</p>
            <p className="text-sm font-medium mb-1" style={S.text}>{activeType.charAt(0).toUpperCase() + activeType.slice(1)} review coming soon.</p>
            <p className="text-sm" style={S.muted}>The daily flow is taking shape first — weekly and monthly will follow the same pattern.</p>
          </div>
        ) : done ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center py-24">
            <p className="text-5xl">✅</p>
            <div>
              <h2 className="text-2xl font-semibold mb-2" style={S.text}>Review done.</h2>
              <p className="text-sm max-w-sm mx-auto" style={S.muted}>Everything's locked in as of right now. Your Daily page has the fresh picture.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="primary" onClick={() => navigate('/daily')}>Go to Daily →</Button>
              <Button variant="secondary" onClick={handleNewReview}>Run Another Review</Button>
            </div>
          </div>
        ) : !started ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center py-24">
            <p className="text-5xl">🔍</p>
            <div>
              <h2 className="text-2xl font-semibold mb-2" style={S.text}>Ready for your review?</h2>
              <p className="text-sm max-w-sm mx-auto" style={S.muted}>
                Clicking Start pulls a fresh snapshot of your email, calendar, and system — right now, not from whenever you last opened this page.
              </p>
            </div>
            <Button variant="primary" onClick={() => setStarted(true)} style={{ padding: '0.625rem 3rem', fontSize: '1rem' }}>
              Start Review
            </Button>
          </div>
        ) : step === 1 ? (
          <div className="max-w-2xl mx-auto">
            {/* Step indicator */}
            <div className="flex items-center gap-3 px-6 pt-5 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--accent)', color: 'var(--app-bg)' }}>1</span>
                <span className="text-sm font-medium" style={S.text}>Get Current</span>
              </div>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
              <div className="flex items-center gap-2" style={{ opacity: 0.4 }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--border)', color: 'var(--text-secondary)' }}>2</span>
                <span className="text-sm font-medium" style={S.muted}>Make a Plan</span>
              </div>
            </div>
            <GetCurrentStep onReady={handleReady} />
            {starting && (
              <div className="flex justify-center pb-4">
                <p className="text-sm" style={S.muted}><Loader2 size={14} className="animate-spin inline mr-2" />Starting review session…</p>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Step indicator */}
            <div className="flex items-center gap-3 px-6 pt-4 pb-3 shrink-0">
              <div className="flex items-center gap-2" style={{ opacity: 0.4 }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--accent-green)', color: 'var(--app-bg)' }}>✓</span>
                <span className="text-sm font-medium" style={S.muted}>Get Current</span>
              </div>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--accent)', color: 'var(--app-bg)' }}>2</span>
                <span className="text-sm font-medium" style={S.text}>Make a Plan</span>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <MakePlanStep
                reviewId={review?.id}
                onSaveConversation={handleSaveConversation}
                onComplete={handleComplete}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
