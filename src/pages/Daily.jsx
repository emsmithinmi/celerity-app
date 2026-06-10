import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { useDaily } from '../hooks/useDaily'
import { useTasks } from '../hooks/useTasks'
import { useProjects } from '../hooks/useProjects'
import { createPerson } from '../lib/api/people'
import { updateChallenge, updateDailyBrief } from '../lib/api/daily'
import { getReviewForTargetDate } from '../lib/api/reviews'
import { generateDailyBrief } from '../lib/ai/skills/dailyBrief'
import { refreshChallenge } from '../lib/ai/skills/refreshChallenge'
import { getStuckSuggestions } from '../lib/ai/skills/stuckHelper'
import { useAIConfig } from '../hooks/useAI'

import DailyQuote     from '../components/daily/DailyQuote'
import StatCards      from '../components/daily/StatCards'
import DailyBrief     from '../components/daily/DailyBrief'
import AgendaSection  from '../components/daily/AgendaSection'
import ProjectsSection from '../components/daily/ProjectsSection'
import TasksSection   from '../components/daily/TasksSection'
import NotesSection   from '../components/daily/NotesSection'
import HabitsSection  from '../components/daily/HabitsSection'
import ChallengeSection from '../components/daily/ChallengeSection'
import Button         from '../components/ui/Button'

import { supabase } from '../lib/supabase'

async function fetchCalendarEventsForDate(dateStr) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    // Compute local-midnight boundaries so the edge function queries the right UTC range
    const timeMin = new Date(dateStr + 'T00:00:00').toISOString()
    const timeMax = new Date(dateStr + 'T23:59:59').toISOString()
    const res = await fetch(`${supabaseUrl}/functions/v1/google-calendar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ date: dateStr, timeMin, timeMax }),
    })
    if (!res.ok) return []
    const { events } = await res.json()
    return events ?? []
  } catch {
    return []
  }
}

import {
  CaptureTaskModal,
  CaptureProjectModal,
  CapturePersonModal,
  QuickNoteModal,
} from '../components/daily/QuickCaptureModals'

import { useTasks as useTasksCapture } from '../hooks/useTasks'
import { useProjects as useProjectsCapture } from '../hooks/useProjects'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function todayStr() {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time
}

function shiftDate(dateStr, days) {
  // Use noon local time to avoid daylight-saving edge cases
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-CA')
}

// ─── Date header with navigation ─────────────────────────────────────────────
function DateHeader({ dateStr, isToday, onPrev, onNext, onToday }) {
  const d = new Date(dateStr + 'T12:00:00')

  return (
    <div className="text-center py-4 relative">
      {/* Navigation row */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onClick={onPrev}
          className="flex items-center justify-center rounded-lg transition-colors"
          style={{ width: 28, height: 28, color: 'var(--text-secondary)', backgroundColor: 'var(--border)' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--text-dim)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          title="Previous day"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Day name */}
        <p className="text-4xl font-normal tracking-widest uppercase w-64 text-center" style={{ color: 'var(--highlight)' }}>
          {DAYS[d.getDay()]}
        </p>

        <button
          onClick={onNext}
          disabled={isToday}
          className="flex items-center justify-center rounded-lg transition-colors"
          style={{ width: 28, height: 28, color: isToday ? 'var(--text-dim)' : 'var(--text-secondary)', backgroundColor: 'var(--border)', cursor: isToday ? 'default' : 'pointer', opacity: isToday ? 0.4 : 1 }}
          onMouseEnter={e => { if (!isToday) { e.currentTarget.style.backgroundColor = 'var(--text-dim)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
          onMouseLeave={e => { if (!isToday) { e.currentTarget.style.backgroundColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
          title={isToday ? 'No future dates' : 'Next day'}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Divider line */}
      <div className="my-2 h-px mx-auto w-20" style={{ backgroundColor: 'var(--border)' }} />

      {/* Full date */}
      <h1 className="text-5xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {MONTHS[d.getMonth()]} {d.getDate()}, {d.getFullYear()}
      </h1>

      {/* "Today" pill — only visible when browsing another day */}
      {!isToday && (
        <div className="flex justify-center mt-4">
          <button
            onClick={onToday}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={{ backgroundColor: 'var(--highlight)', color: 'var(--app-bg)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--highlight-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--highlight)'}
          >
            ↩ Back to Today
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Daily() {
  const navigate = useNavigate()

  // ── Date navigation ──
  const [searchParams] = useSearchParams()
  const initialDate = searchParams.get('date') ?? todayStr()
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const isToday = selectedDate === todayStr()
  const goBack    = () => setSelectedDate(d => shiftDate(d, -1))
  const goForward = () => setSelectedDate(d => shiftDate(d, +1))
  const goToday   = () => setSelectedDate(todayStr())

  // ── Data for selected date ──
  const { note, habitHistory, stats, loading, error, toggleHabit, addNote, editNote, deleteNote, updateTopOfMind, refreshStats, refresh: reloadNote } = useDaily(selectedDate)

  // Quick capture hooks (separate so modals don't re-render sections)
  const { createTask }    = useTasksCapture({})
  const { createProject } = useProjectsCapture({})

  // Agenda data
  const { tasks: dueTasks }         = useTasks({ due_date: selectedDate, not_status: 'done' })
  const { projects: endingProjects } = useProjects({ end_date: selectedDate })
  const [calendarEvents, setCalendarEvents] = useState([])
  useEffect(() => {
    fetchCalendarEventsForDate(selectedDate).then(setCalendarEvents).catch(() => {})
  }, [selectedDate])

  // Brief from the latest completed review that planned this date.
  // note.daily_brief (mid-day refresh) takes priority when present.
  const [reviewBrief, setReviewBrief] = useState(null)
  useEffect(() => {
    setReviewBrief(null)
    getReviewForTargetDate(selectedDate)
      .then(r => setReviewBrief(r?.content?.brief ?? null))
      .catch(() => {})
  }, [selectedDate])



  // Modal state
  const [modal, setModal] = useState(null)

  // "I'm Stuck" panel
  const { configured: aiConfigured } = useAIConfig()
  const [stuckOpen,       setStuckOpen]       = useState(false)
  const [stuckLoading,    setStuckLoading]    = useState(false)
  const [stuckResult,     setStuckResult]     = useState(null)

  const handleStuck = async () => {
    setStuckOpen(true)
    if (stuckResult) return   // already loaded this session
    setStuckLoading(true)
    try {
      const result = await getStuckSuggestions(aiConfigured)
      setStuckResult(result)
    } catch {
      setStuckResult({ opening: "Couldn't load suggestions — try again in a moment.", suggestions: [] })
    } finally {
      setStuckLoading(false)
    }
  }

  const handleChallengeUpdate = async (updated) => {
    if (!note) return
    await updateChallenge(note.id, updated)
  }

  const handleChallengeRefresh = async () => {
    if (!note) return
    await refreshChallenge(note.id)
    reloadNote()
  }

  const handleBriefRefresh = async () => {
    if (!note) return
    const isRefresh = !!(note.daily_brief || reviewBrief)  // already has one → mid-day refresh
    const brief = await generateDailyBrief(selectedDate, isRefresh)
    await updateDailyBrief(note.id, brief)
    await reloadNote()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: 'var(--danger)' }}>Error: {error}</p>
      </div>
    )
  }


  return (
    <>
      {/* ── Scrollable page content ── */}
      <div className="px-10 py-4 space-y-6 pb-24">

        {/* Date + nav */}
        <DateHeader
          dateStr={selectedDate}
          isToday={isToday}
          onPrev={goBack}
          onNext={goForward}
          onToday={goToday}
        />
        <DailyQuote note={note} dateStr={selectedDate} />


        {/* Quick action bar */}
        <div className="flex gap-2 flex-wrap justify-center">
          {[
            { label: 'New Task',    key: 'task'    },
            { label: 'New Project', key: 'project' },
            { label: 'New Person',  key: 'person'  },
            { label: 'New Note',    key: 'note'    },
          ].map(({ label, key }) => (
            <Button
              key={key}
              variant="secondary"
              size="sm"
              onClick={() => setModal(key)}
            >
              {label}
            </Button>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleStuck}
          >
            🤷 I'm Stuck
          </Button>
        </div>

        {/* "I'm Stuck" panel */}
        {stuckOpen && (
          <div
            className="rounded-2xl border p-5 space-y-4"
            style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--accent)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                🤷 Easy wins to get you moving
              </h3>
              <button
                onClick={() => setStuckOpen(false)}
                className="text-xs px-2 py-0.5 rounded hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-secondary)' }}
              >
                ✕ dismiss
              </button>
            </div>

            {stuckLoading ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Finding your easiest wins…</p>
            ) : stuckResult ? (
              <>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{stuckResult.opening}</p>
                {stuckResult.suggestions.length > 0 ? (
                  <div className="space-y-2">
                    {stuckResult.suggestions.map(s => (
                      <a
                        key={s.task_id}
                        href={`/tasks/${s.task_id}`}
                        className="flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-opacity hover:opacity-80"
                        style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', textDecoration: 'none' }}
                      >
                        <span className="text-base mt-0.5">⚡</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                          {s.reason && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.reason}</p>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-dim)' }}>No next actions found — add some tasks first.</p>
                )}
                <button
                  onClick={() => { setStuckResult(null); handleStuck() }}
                  className="flex items-center justify-center rounded-md transition-opacity hover:opacity-80"
                  style={{ width: 26, height: 26, color: 'var(--text-dim)', backgroundColor: 'transparent' }}
                  title="Refresh suggestions"
                >
                  <RefreshCw size={13} />
                </button>
              </>
            ) : null}
          </div>
        )}

        {/* Daily Brief */}
        <DailyBrief
          brief={note?.daily_brief ?? reviewBrief ?? null}
          topOfMind={note?.top_of_mind ?? []}
          noteId={note?.id}
          onRefresh={handleBriefRefresh}
          onSaveTopOfMind={updateTopOfMind}
        />

        {/* Stat cards — sit under Top of Mind */}
        <StatCards stats={stats} />


        {/* Agenda */}
        <AgendaSection
          calendarEvents={calendarEvents}
          dueTasks={dueTasks}
          endingProjects={endingProjects}
          onRefresh={() => fetchCalendarEventsForDate(selectedDate).then(setCalendarEvents).catch(() => {})}
        />


        {/* Projects */}
        <ProjectsSection />


        {/* Tasks */}
        <TasksSection onRefreshStats={refreshStats} />


        {/* Notes */}
        <NotesSection
          notes={note?.notes ?? []}
          onAdd={addNote}
          onEdit={editNote}
          onDelete={deleteNote}
        />


        {/* Habits */}
        <HabitsSection
          note={note}
          habitHistory={habitHistory}
          onToggle={toggleHabit}
        />


        {/* Daily Challenge */}
        <ChallengeSection
          challenge={note?.code_challenge}
          onUpdate={handleChallengeUpdate}
          onComplete={() => toggleHabit('habit_code_challenge', true)}
          onRefresh={handleChallengeRefresh}
        />


        {/* Review button */}
        <div className="flex justify-center pb-4">
          <Button
            variant="action"
            onClick={() => navigate('/reviews/daily')}
            style={{ padding: '0.625rem 2.5rem', fontSize: '1rem' }}
          >
            📋 Daily Review
          </Button>
        </div>
      </div>

      {/* ── Quick Capture Modals ── */}
      <CaptureTaskModal
        open={modal === 'task'}
        onClose={() => setModal(null)}
        onCreate={createTask}
      />
      <CaptureProjectModal
        open={modal === 'project'}
        onClose={() => setModal(null)}
        onCreate={createProject}
      />
      <CapturePersonModal
        open={modal === 'person'}
        onClose={() => setModal(null)}
        onCreate={createPerson}
      />
      <QuickNoteModal
        open={modal === 'note'}
        onClose={() => setModal(null)}
        onAdd={addNote}
      />
    </>
  )
}
