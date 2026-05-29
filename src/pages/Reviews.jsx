import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { ensureReview, updateReviewContent, completeReview, updateSuggestions } from '../lib/api/reviews'
import { runDailyReview } from '../lib/ai/skills/dailyReview'
import { useAIConfig } from '../hooks/useAI'
import { useTasks }    from '../hooks/useTasks'
import { useProjects } from '../hooks/useProjects'
import { getHabitHistory } from '../lib/api/daily'
import { HABITS, CHALLENGE_TOPICS } from '../lib/constants'
import { StatusPill } from '../components/ui'
import Button from '../components/ui/Button'

// ─── Constants ────────────────────────────────────────────────────────────────

const REVIEW_TYPES = [
  { key: 'daily',   label: '📋 Daily'   },
  { key: 'weekly',  label: '📅 Weekly'  },
  { key: 'monthly', label: '📆 Monthly' },
]

// ─── Shared sub-components ────────────────────────────────────────────────────

function ReviewSection({ title, children }) {
  return (
    <div className="rounded-xl border p-5 space-y-3" style={{ backgroundColor: '#181825', borderColor: '#313244' }}>
      <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#89b4fa' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

const textareaStyle = {
  backgroundColor: '#1e1e2e',
  borderColor: '#313244',
  color: '#cdd6f4',
}

function ReviewTextarea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
      style={textareaStyle}
      onFocus={e => e.target.style.borderColor = '#89b4fa'}
      onBlur={e => e.target.style.borderColor = '#313244'}
    />
  )
}

// ─── Suggestion card ─────────────────────────────────────────────────────────

function SuggestionCard({ suggestion, onAccept, onSkip, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [edited,  setEdited]  = useState(suggestion.content)

  const TYPE_COLORS = {
    task_update:    { bg: '#1e3a5f', border: '#89b4fa', text: '#89b4fa' },
    project_update: { bg: '#1e2a4a', border: '#cba6f7', text: '#cba6f7' },
    new_task:       { bg: '#1a3a2a', border: '#a6e3a1', text: '#a6e3a1' },
    reminder:       { bg: '#3a2a1e', border: '#fab387', text: '#fab387' },
    insight:        { bg: '#2a1e3a', border: '#f5c2e7', text: '#f5c2e7' },
  }
  const colors = TYPE_COLORS[suggestion.type] ?? TYPE_COLORS.insight

  if (suggestion.status === 'skipped') return null

  return (
    <div
      className="rounded-lg border p-4 space-y-3"
      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
    >
      {/* Type badge + content */}
      <div className="flex items-start gap-2">
        <span
          className="text-xs px-2 py-0.5 rounded shrink-0 mt-0.5"
          style={{ backgroundColor: colors.border + '33', color: colors.text, border: `1px solid ${colors.border}` }}
        >
          {suggestion.type?.replace('_', ' ') ?? 'suggestion'}
        </span>
        {editing ? (
          <textarea
            value={edited}
            onChange={e => setEdited(e.target.value)}
            rows={3}
            className="flex-1 px-2 py-1 rounded text-sm border outline-none resize-none"
            style={textareaStyle}
            autoFocus
          />
        ) : (
          <p className="text-sm flex-1" style={{ color: '#cdd6f4' }}>{suggestion.content}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {editing ? (
          <>
            <Button size="sm" variant="success" onClick={() => { onEdit(edited); setEditing(false) }}>
              Accept Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            {suggestion.status !== 'accepted' && (
              <Button size="sm" variant="success" onClick={onAccept}>✓ Accept</Button>
            )}
            {suggestion.status !== 'accepted' && (
              <button
                onClick={() => setEditing(true)}
                title="Edit suggestion"
                className="flex items-center justify-center rounded-md transition-colors duration-150"
                style={{ width: 30, height: 30, backgroundColor: 'transparent', color: '#6c7086' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#313244'; e.currentTarget.style.color = '#cdd6f4' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6c7086' }}
              >
                <Pencil size={14} />
              </button>
            )}
            <Button size="sm" variant="ghost" onClick={onSkip}>✕ Skip</Button>
            {suggestion.status === 'accepted' && (
              <span className="text-xs self-center" style={{ color: '#a6e3a1' }}>✓ Accepted</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Tomorrow Top-of-Mind editor ──────────────────────────────────────────────

function TomorrowTopOfMind({ items = [], onChange }) {
  const [newItem, setNewItem] = useState('')

  const add = () => {
    if (!newItem.trim()) return
    onChange([...items, newItem.trim()])
    setNewItem('')
  }
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-sm flex-1" style={{ color: '#cdd6f4' }}>• {item}</span>
          <button onClick={() => remove(i)} className="text-xs" style={{ color: '#6c7086' }}>✕</button>
        </div>
      ))}
      <div className="flex gap-2 mt-1">
        <input
          type="text"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Add item… (Enter)"
          className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
          style={textareaStyle}
          onFocus={e => e.target.style.borderColor = '#89b4fa'}
          onBlur={e => e.target.style.borderColor = '#313244'}
        />
        <Button size="sm" variant="secondary" onClick={add}>Add</Button>
      </div>
    </div>
  )
}

// ─── Habit week summary (for daily/weekly review) ─────────────────────────────

function HabitWeekSummary({ history }) {
  const last7 = history.slice(-7)
  return (
    <div className="space-y-2">
      {HABITS.map(h => {
        const count = last7.filter(d => d[h.key]).length
        const pct   = last7.length ? Math.round((count / last7.length) * 100) : 0
        const color = pct >= 70 ? '#0F9D58' : pct >= 40 ? '#FBBC05' : '#DB4437'
        return (
          <div key={h.key} className="flex items-center gap-3">
            <span className="text-base shrink-0">{h.icon}</span>
            <span className="text-sm w-28 shrink-0" style={{ color: '#cdd6f4' }}>{h.label}</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#313244' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="text-xs w-8 text-right shrink-0" style={{ color: '#6c7086' }}>{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Task snapshot (for review context) ──────────────────────────────────────

function TaskSnapshot({ tasks, label }) {
  if (!tasks.length) return <p className="text-sm" style={{ color: '#6c7086' }}>No {label} tasks.</p>
  return (
    <div className="space-y-1.5">
      {tasks.slice(0, 8).map(t => (
        <div key={t.id} className="flex items-center gap-2">
          <StatusPill status={t.status} type="task" />
          <span className="text-sm truncate" style={{ color: '#cdd6f4' }}>{t.title}</span>
        </div>
      ))}
      {tasks.length > 8 && (
        <p className="text-xs" style={{ color: '#6c7086' }}>+{tasks.length - 8} more</p>
      )}
    </div>
  )
}

// ─── Project snapshot ────────────────────────────────────────────────────────

function ProjectSnapshot({ projects, label }) {
  if (!projects.length) return <p className="text-sm" style={{ color: '#6c7086' }}>No {label} projects.</p>
  return (
    <div className="space-y-1.5">
      {projects.slice(0, 6).map(p => (
        <div key={p.id} className="flex items-center gap-2">
          <StatusPill status={p.status} type="project" />
          <span className="text-sm truncate flex-1" style={{ color: '#cdd6f4' }}>{p.title}</span>
          {p.area && <span className="text-xs shrink-0" style={{ color: '#6c7086' }}>{p.area}</span>}
        </div>
      ))}
      {projects.length > 6 && (
        <p className="text-xs" style={{ color: '#6c7086' }}>+{projects.length - 6} more</p>
      )}
    </div>
  )
}

// ─── DAILY REVIEW ─────────────────────────────────────────────────────────────

function DailyReview({ review, onContentChange, suggestions, onSuggestionChange, onAiGenerate, aiLoading, aiResult, aiConfigured }) {
  const c = review.content ?? {}

  const { tasks: nextActions } = useTasks({ status: 'next_action' })
  const { tasks: doneTasks }   = useTasks({ status: 'done'        })
  const { projects: inProgress } = useProjects({ status: 'in_progress' })
  const { projects: stalled }    = useProjects({ status: 'stalled'     })
  const [habitHistory, setHabitHistory] = useState([])

  useEffect(() => { getHabitHistory(7).then(setHabitHistory) }, [])

  const set = (key, val) => onContentChange({ ...c, [key]: val })

  return (
    <div className="space-y-4">
      <ReviewSection title="🏆 Today's Wins">
        <ReviewTextarea
          value={c.wins ?? ''}
          onChange={v => set('wins', v)}
          placeholder="What did you accomplish today? What moved forward?"
        />
      </ReviewSection>

      <ReviewSection title="🪞 Reflections">
        <ReviewTextarea
          value={c.reflections ?? ''}
          onChange={v => set('reflections', v)}
          placeholder="What worked well? What was difficult? What would you do differently?"
        />
      </ReviewSection>

      <ReviewSection title="⚡ Next Actions">
        <TaskSnapshot tasks={nextActions} label="next action" />
        <ReviewTextarea
          value={c.tasks_notes ?? ''}
          onChange={v => set('tasks_notes', v)}
          placeholder="Any tasks to clear, move, or prioritize?"
          rows={2}
        />
      </ReviewSection>

      <ReviewSection title="📁 Projects">
        <div className="space-y-3">
          <div>
            <p className="text-xs mb-2" style={{ color: '#6c7086' }}>In Progress</p>
            <ProjectSnapshot projects={inProgress} label="in progress" />
          </div>
          {stalled.length > 0 && (
            <div>
              <p className="text-xs mb-2" style={{ color: '#cba6f7' }}>⚠ Stalled</p>
              <ProjectSnapshot projects={stalled} label="stalled" />
            </div>
          )}
        </div>
        <ReviewTextarea
          value={c.projects_notes ?? ''}
          onChange={v => set('projects_notes', v)}
          placeholder="Any project updates or notes?"
          rows={2}
        />
      </ReviewSection>

      <ReviewSection title="🧘 Habit Check">
        <HabitWeekSummary history={habitHistory} />
      </ReviewSection>

      <ReviewSection title="🌅 Tomorrow Setup">
        <div className="space-y-4">
          <div>
            <p className="text-xs mb-2 font-medium" style={{ color: '#6c7086' }}>Top of Mind for Tomorrow</p>
            <TomorrowTopOfMind
              items={c.tomorrow_top_of_mind ?? []}
              onChange={v => set('tomorrow_top_of_mind', v)}
            />
          </div>
          <div>
            <p className="text-xs mb-2 font-medium" style={{ color: '#6c7086' }}>Coding Challenge Topic</p>
            <div className="flex gap-2 flex-wrap">
              {CHALLENGE_TOPICS.map(t => (
                <button
                  key={t}
                  onClick={() => set('challenge_topic', t)}
                  className="px-3 py-1.5 rounded-lg text-xs capitalize transition-colors"
                  style={{
                    backgroundColor: c.challenge_topic === t ? '#89b4fa' : '#313244',
                    color: c.challenge_topic === t ? '#000' : '#cdd6f4',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <ReviewTextarea
            value={c.tomorrow_notes ?? ''}
            onChange={v => set('tomorrow_notes', v)}
            placeholder="Anything else to set up for tomorrow?"
            rows={2}
          />
        </div>
      </ReviewSection>

      {/* AI Generate section — only shows when AI is configured */}
      <ReviewSection title="🤖 AI Daily Review">
        {!aiConfigured ? (
          <p className="text-sm" style={{ color: '#6c7086' }}>
            Add an AI provider in{' '}
            <a href="/settings" className="underline" style={{ color: '#89b4fa' }}>Settings</a>{' '}
            to enable AI-powered daily review generation.
          </p>
        ) : aiResult ? (
          <div className="space-y-2">
            <p className="text-xs" style={{ color: '#a6e3a1' }}>
              ✓ Generated for {aiResult.tomorrowStr} — Top of Mind, Agenda, and Challenge are set. Review the suggestions below.
            </p>
            <Button size="sm" variant="secondary" onClick={onAiGenerate} disabled={aiLoading}>
              Regenerate
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: '#6c7086' }}>
              Claude reads your projects, tasks, and last 30 days of notes to set up tomorrow —
              Top of Mind, Agenda, Challenge, and observations.
            </p>
            <Button size="sm" variant="action" onClick={onAiGenerate} disabled={aiLoading}>
              {aiLoading
                ? <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />Generating…</span>
                : 'Generate with AI'
              }
            </Button>
          </div>
        )}
      </ReviewSection>

      {suggestions.length > 0 && (
        <ReviewSection title="💡 Suggestions">
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <SuggestionCard
                key={s.id ?? i}
                suggestion={s}
                onAccept={() => onSuggestionChange(suggestions.map((x, j) => j === i ? { ...x, status: 'accepted' } : x))}
                onSkip={() => onSuggestionChange(suggestions.map((x, j) => j === i ? { ...x, status: 'skipped'  } : x))}
                onEdit={(edited) => onSuggestionChange(suggestions.map((x, j) => j === i ? { ...x, status: 'accepted', content: edited } : x))}
              />
            ))}
          </div>
        </ReviewSection>
      )}
    </div>
  )
}

// ─── WEEKLY REVIEW ────────────────────────────────────────────────────────────

function WeeklyReview({ review, onContentChange, suggestions, onSuggestionChange }) {
  const c = review.content ?? {}

  const { tasks: waiting } = useTasks({ status: 'waiting' })
  const { tasks: someday } = useTasks({ status: 'someday' })
  const { projects: all }  = useProjects({})
  const [habitHistory, setHabitHistory] = useState([])

  useEffect(() => { getHabitHistory(7).then(setHabitHistory) }, [])

  const set = (key, val) => onContentChange({ ...c, [key]: val })

  const inProgress = all.filter(p => p.status === 'in_progress' && !p.archived_at)
  const completed  = all.filter(p => p.status === 'completed'   && !p.archived_at)
  const stalled    = all.filter(p => p.status === 'stalled'     && !p.archived_at)

  return (
    <div className="space-y-4">
      <ReviewSection title="🏆 Week's Wins">
        <ReviewTextarea
          value={c.wins ?? ''}
          onChange={v => set('wins', v)}
          placeholder="What were your biggest accomplishments this week?"
        />
      </ReviewSection>

      <ReviewSection title="📁 Projects Overview">
        <div className="space-y-3">
          {completed.length > 0 && (
            <div>
              <p className="text-xs mb-2" style={{ color: '#a6e3a1' }}>✓ Completed This Week</p>
              <ProjectSnapshot projects={completed} label="completed" />
            </div>
          )}
          <div>
            <p className="text-xs mb-2" style={{ color: '#89b4fa' }}>In Progress</p>
            <ProjectSnapshot projects={inProgress} label="in progress" />
          </div>
          {stalled.length > 0 && (
            <div>
              <p className="text-xs mb-2" style={{ color: '#cba6f7' }}>⚠ Stalled</p>
              <ProjectSnapshot projects={stalled} label="stalled" />
            </div>
          )}
        </div>
        <ReviewTextarea
          value={c.projects_notes ?? ''}
          onChange={v => set('projects_notes', v)}
          placeholder="What moved forward? What's blocked? What needs attention?"
        />
      </ReviewSection>

      <ReviewSection title="⏳ Waiting & Someday">
        <div className="space-y-3">
          {waiting.length > 0 && (
            <div>
              <p className="text-xs mb-2" style={{ color: '#f38ba8' }}>Waiting</p>
              <TaskSnapshot tasks={waiting} label="waiting" />
            </div>
          )}
          {someday.length > 0 && (
            <div>
              <p className="text-xs mb-2" style={{ color: '#6c7086' }}>Someday / Maybe</p>
              <TaskSnapshot tasks={someday} label="someday" />
            </div>
          )}
        </div>
        <ReviewTextarea
          value={c.waiting_notes ?? ''}
          onChange={v => set('waiting_notes', v)}
          placeholder="Any waiting tasks to follow up on? Any someday items to activate?"
          rows={2}
        />
      </ReviewSection>

      <ReviewSection title="🧘 Habit Review (7 Days)">
        <HabitWeekSummary history={habitHistory} />
        <ReviewTextarea
          value={c.habit_notes ?? ''}
          onChange={v => set('habit_notes', v)}
          placeholder="Any habit patterns to address next week?"
          rows={2}
        />
      </ReviewSection>

      <ReviewSection title="🎯 Next Week Goals">
        <ReviewTextarea
          value={c.next_week_goals ?? ''}
          onChange={v => set('next_week_goals', v)}
          placeholder="What are your top 3 priorities for next week? What projects to push forward?"
        />
      </ReviewSection>

      <ReviewSection title="📝 Notes">
        <ReviewTextarea
          value={c.notes ?? ''}
          onChange={v => set('notes', v)}
          placeholder="Anything else on your mind?"
          rows={2}
        />
      </ReviewSection>

      {suggestions.length > 0 && (
        <ReviewSection title="🤖 AI Suggestions">
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <SuggestionCard
                key={s.id ?? i}
                suggestion={s}
                onAccept={() => onSuggestionChange(suggestions.map((x, j) => j === i ? { ...x, status: 'accepted' } : x))}
                onSkip={() => onSuggestionChange(suggestions.map((x, j) => j === i ? { ...x, status: 'skipped'  } : x))}
                onEdit={(edited) => onSuggestionChange(suggestions.map((x, j) => j === i ? { ...x, status: 'accepted', content: edited } : x))}
              />
            ))}
          </div>
        </ReviewSection>
      )}
    </div>
  )
}

// ─── MONTHLY REVIEW ───────────────────────────────────────────────────────────

function MonthlyReview({ review, onContentChange, suggestions, onSuggestionChange }) {
  const c = review.content ?? {}

  const { projects: all } = useProjects({})
  const [habitHistory, setHabitHistory] = useState([])

  useEffect(() => { getHabitHistory(30).then(setHabitHistory) }, [])

  const set = (key, val) => onContentChange({ ...c, [key]: val })

  const completed  = all.filter(p => p.status === 'completed' && !p.archived_at)
  const highlights = all.filter(p => p.is_highlight && !p.archived_at)

  // Last 30 days habit summary
  const getMonthPct = (habitKey) => {
    if (!habitHistory.length) return 0
    const completed = habitHistory.filter(d => d[habitKey]).length
    return Math.round((completed / habitHistory.length) * 100)
  }

  return (
    <div className="space-y-4">
      <ReviewSection title="⭐ Month's Highlights">
        {highlights.length > 0 && (
          <div className="mb-3">
            <p className="text-xs mb-2" style={{ color: '#f9e2af' }}>Highlighted Projects</p>
            <ProjectSnapshot projects={highlights} label="highlighted" />
          </div>
        )}
        <ReviewTextarea
          value={c.highlights ?? ''}
          onChange={v => set('highlights', v)}
          placeholder="What were the biggest wins and moments worth remembering this month?"
        />
      </ReviewSection>

      <ReviewSection title="✅ Completed Projects">
        <ProjectSnapshot projects={completed} label="completed" />
        <ReviewTextarea
          value={c.completed_notes ?? ''}
          onChange={v => set('completed_notes', v)}
          placeholder="Any reflections on what you completed?"
          rows={2}
        />
      </ReviewSection>

      <ReviewSection title="🧘 Habit Month (30 Days)">
        <div className="space-y-2">
          {HABITS.map(h => {
            const pct   = getMonthPct(h.key)
            const color = pct >= 70 ? '#0F9D58' : pct >= 40 ? '#FBBC05' : '#DB4437'
            return (
              <div key={h.key} className="flex items-center gap-3">
                <span className="text-base shrink-0">{h.icon}</span>
                <span className="text-sm w-28 shrink-0" style={{ color: '#cdd6f4' }}>{h.label}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#313244' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <span className="text-xs w-8 text-right shrink-0" style={{ color: '#6c7086' }}>{pct}%</span>
              </div>
            )
          })}
        </div>
        <ReviewTextarea
          value={c.habit_notes ?? ''}
          onChange={v => set('habit_notes', v)}
          placeholder="Habit patterns this month? Any to start, stop, or adjust?"
          rows={2}
        />
      </ReviewSection>

      <ReviewSection title="🗂 Areas of Focus">
        <ReviewTextarea
          value={c.areas_focus ?? ''}
          onChange={v => set('areas_focus', v)}
          placeholder="Which areas of your life (work, health, personal, etc.) got attention? Which were neglected?"
        />
      </ReviewSection>

      <ReviewSection title="🎯 Next Month Goals">
        <ReviewTextarea
          value={c.next_month_goals ?? ''}
          onChange={v => set('next_month_goals', v)}
          placeholder="What are your top priorities for next month? What projects to start or push?"
        />
      </ReviewSection>

      <ReviewSection title="📝 Notes">
        <ReviewTextarea
          value={c.notes ?? ''}
          onChange={v => set('notes', v)}
          placeholder="Anything else — patterns, themes, or insights from this month."
          rows={2}
        />
      </ReviewSection>

      {suggestions.length > 0 && (
        <ReviewSection title="🤖 AI Suggestions">
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <SuggestionCard
                key={s.id ?? i}
                suggestion={s}
                onAccept={() => onSuggestionChange(suggestions.map((x, j) => j === i ? { ...x, status: 'accepted' } : x))}
                onSkip={() => onSuggestionChange(suggestions.map((x, j) => j === i ? { ...x, status: 'skipped'  } : x))}
                onEdit={(edited) => onSuggestionChange(suggestions.map((x, j) => j === i ? { ...x, status: 'accepted', content: edited } : x))}
              />
            ))}
          </div>
        </ReviewSection>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Reviews() {
  const { type: urlType } = useParams()
  const navigate = useNavigate()

  const activeType = REVIEW_TYPES.find(r => r.key === urlType)?.key ?? 'daily'

  const today = new Date().toISOString().split('T')[0]

  const [review,      setReview]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [completed,   setCompleted]   = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiResult,    setAiResult]    = useState(null)
  const [aiError,     setAiError]     = useState(null)
  const { configured: aiConfigured }  = useAIConfig()

  // Autosave timer
  const saveTimer = useRef(null)

  const loadReview = useCallback(async () => {
    setLoading(true)
    setCompleted(false)
    try {
      const r = await ensureReview(activeType, today)
      setReview(r)
      setSuggestions(r.suggestions ?? [])
      setCompleted(r.status === 'completed')
    } finally {
      setLoading(false)
    }
  }, [activeType, today])

  useEffect(() => { loadReview() }, [loadReview])

  // Autosave content after 1.5s idle
  const handleContentChange = (newContent) => {
    setReview(prev => ({ ...prev, content: newContent }))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (review?.id) {
        setSaving(true)
        await updateReviewContent(review.id, newContent)
        setSaving(false)
      }
    }, 1500)
  }

  const handleSuggestionChange = async (updated) => {
    setSuggestions(updated)
    if (review?.id) await updateSuggestions(review.id, updated)
  }

  const handleAiGenerate = async () => {
    if (!review?.id) return
    setAiLoading(true)
    setAiError(null)
    try {
      await updateReviewContent(review.id, review.content)
      const res = await runDailyReview(review.id, review.content ?? {})
      setSuggestions(res.suggestions)
      setAiResult(res)
    } catch (err) {
      setAiError(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!review?.id) return
    setSaving(true)
    // Save current content first
    await updateReviewContent(review.id, review.content)
    await completeReview(review.id)
    setSaving(false)
    setCompleted(true)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: '#313244' }}
      >
        <h1 className="text-xl font-semibold" style={{ color: '#cdd6f4' }}>Reviews</h1>
        {saving && <span className="text-xs" style={{ color: '#6c7086' }}>Saving…</span>}
        {!saving && review?.status === 'completed' && (
          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#1a3a2a', color: '#a6e3a1', border: '1px solid #a6e3a1' }}>
            ✓ Completed
          </span>
        )}
      </div>

      {/* Type tabs */}
      <div
        className="flex gap-1 px-4 py-3 border-b shrink-0"
        style={{ borderColor: '#313244' }}
      >
        {REVIEW_TYPES.map(rt => (
          <button
            key={rt.key}
            onClick={() => navigate(`/reviews/${rt.key}`)}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: activeType === rt.key ? '#313244' : 'transparent',
              color: activeType === rt.key ? '#cdd6f4' : '#6c7086',
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
            <p className="text-sm" style={{ color: '#6c7086' }}>Loading…</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-6 py-5 space-y-4">
            {/* Date + status banner */}
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: '#6c7086' }}>
                {new Date(today + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                })}
              </p>
              {completed && (
                <span className="text-xs" style={{ color: '#a6e3a1' }}>Review completed ✓</span>
              )}
            </div>

            {/* Completed overlay message */}
            {completed && (
              <div
                className="rounded-xl border px-4 py-3 text-sm"
                style={{ backgroundColor: '#1a3a2a', borderColor: '#a6e3a1', color: '#a6e3a1' }}
              >
                ✓ This review is marked complete. You can still edit it below.
              </div>
            )}

            {/* Review content */}
            {review && (
              <>
                {activeType === 'daily' && (
                  <>
                    {aiError && (
                      <div className="rounded-lg border px-4 py-3 text-sm" style={{ backgroundColor: '#3a1e1e', borderColor: '#f38ba8', color: '#f38ba8' }}>
                        AI error: {aiError}
                      </div>
                    )}
                    <DailyReview
                      review={review}
                      onContentChange={handleContentChange}
                      suggestions={suggestions}
                      onSuggestionChange={handleSuggestionChange}
                      onAiGenerate={handleAiGenerate}
                      aiLoading={aiLoading}
                      aiResult={aiResult}
                      aiConfigured={aiConfigured}
                    />
                  </>
                )}
                {activeType === 'weekly' && (
                  <WeeklyReview
                    review={review}
                    onContentChange={handleContentChange}
                    suggestions={suggestions}
                    onSuggestionChange={handleSuggestionChange}
                  />
                )}
                {activeType === 'monthly' && (
                  <MonthlyReview
                    review={review}
                    onContentChange={handleContentChange}
                    suggestions={suggestions}
                    onSuggestionChange={handleSuggestionChange}
                  />
                )}
              </>
            )}

            {/* Complete button */}
            {!completed && (
              <div className="pt-2 pb-8">
                <Button
                  variant="success"
                  size="md"
                  onClick={handleComplete}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : `Complete ${REVIEW_TYPES.find(r => r.key === activeType)?.label.split(' ')[1]} Review ✓`}
                </Button>
              </div>
            )}
            {completed && (
              <div className="pb-8">
                <Button variant="secondary" size="sm" onClick={() => navigate('/daily')}>
                  ← Back to Daily
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
