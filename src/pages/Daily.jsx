import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useDaily } from '../hooks/useDaily'
import { useTasks } from '../hooks/useTasks'
import { useProjects } from '../hooks/useProjects'
import { createPerson } from '../lib/api/people'
import { updateChallenge } from '../lib/api/daily'

import DailyQuote     from '../components/daily/DailyQuote'
import StatCards      from '../components/daily/StatCards'
import TopOfMind      from '../components/daily/TopOfMind'
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
    const res = await fetch(`${supabaseUrl}/functions/v1/google-calendar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ date: dateStr }),
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
          style={{ width: 32, height: 32, color: 'var(--text-secondary)', backgroundColor: 'var(--border)' }}
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
          className="flex items-center justify-center rounded-lg transition-colors"
          style={{ width: 32, height: 32, color: 'var(--text-secondary)', backgroundColor: 'var(--border)' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--text-dim)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          title="Next day"
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
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const isToday = selectedDate === todayStr()
  const goBack    = () => setSelectedDate(d => shiftDate(d, -1))
  const goForward = () => setSelectedDate(d => shiftDate(d, +1))
  const goToday   = () => setSelectedDate(todayStr())

  // ── Data for selected date ──
  const { note, habitHistory, stats, loading, error, toggleHabit, addNote, editNote, deleteNote, updateTopOfMind, refreshStats } = useDaily(selectedDate)

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


  // Modal state
  const [modal, setModal] = useState(null)

  const handleChallengeUpdate = async (updated) => {
    if (!note) return
    await updateChallenge(note.id, updated)
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
        </div>

        {/* Top of Mind */}
        <TopOfMind
          items={note?.top_of_mind ?? []}
          onSave={updateTopOfMind}
        />

        {/* Stat cards — sit under Top of Mind */}
        <StatCards stats={stats} />


        {/* Agenda */}
        <AgendaSection
          calendarEvents={calendarEvents}
          dueTasks={dueTasks}
          endingProjects={endingProjects}
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
        />


        {/* Review buttons */}
        <div className="flex gap-3 flex-wrap justify-center pb-4">
          {[
            { label: '📋 Daily Review',   to: '/reviews/daily'   },
            { label: '📅 Weekly Review',  to: '/reviews/weekly'  },
            { label: '📆 Monthly Review', to: '/reviews/monthly' },
          ].map(({ label, to }) => (
            <Button
              key={to}
              variant="action"
              size="sm"
              onClick={() => navigate(to)}
            >
              {label}
            </Button>
          ))}
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
