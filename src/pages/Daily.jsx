import { useState, useEffect } from 'react'
import { useDaily } from '../hooks/useDaily'
import { useTasks } from '../hooks/useTasks'
import { useProjects } from '../hooks/useProjects'
import { createPerson } from '../lib/api/people'
import { updateChallenge } from '../lib/api/daily'

import DailyQuote     from '../components/daily/DailyQuote'
import StatCards      from '../components/daily/StatCards'
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

// ─── Date header (cosmetic, no navigation) ───────────────────────────────────
function DateHeader({ dateStr }) {
  const d = new Date(dateStr + 'T12:00:00')

  return (
    <div className="text-center py-4">
      <p className="text-4xl font-normal tracking-widest uppercase" style={{ color: 'var(--highlight)' }}>
        {DAYS[d.getDay()]}
      </p>
      <div className="my-2 h-px mx-auto w-20" style={{ backgroundColor: 'var(--border)' }} />
      <h1 className="text-5xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {MONTHS[d.getMonth()]} {d.getDate()}, {d.getFullYear()}
      </h1>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Daily() {
  const today = todayStr()

  // ── Data for today ──
  const { note, habitHistory, stats, loading, error, toggleHabit, addNote, editNote, deleteNote, refreshStats } = useDaily(today)

  // Quick capture hooks (separate so modals don't re-render sections)
  const { createTask }    = useTasksCapture({})
  const { createProject } = useProjectsCapture({})

  // Agenda data
  const { tasks: dueTasks }         = useTasks({ due_date: today, not_status: 'done' })
  const { projects: endingProjects } = useProjects({ end_date: today })
  const [calendarEvents, setCalendarEvents] = useState([])
  useEffect(() => {
    fetchCalendarEventsForDate(today).then(setCalendarEvents).catch(() => {})
  }, [today])

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

        <DateHeader dateStr={today} />
        <DailyQuote note={note} dateStr={today} />


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

        {/* Stat cards */}
        <StatCards stats={stats} />


        {/* Agenda */}
        <AgendaSection
          calendarEvents={calendarEvents}
          dueTasks={dueTasks}
          endingProjects={endingProjects}
          onRefresh={() => fetchCalendarEventsForDate(today).then(setCalendarEvents).catch(() => {})}
        />


        {/* Notes */}
        <NotesSection
          notes={note?.notes ?? []}
          onAdd={addNote}
          onEdit={editNote}
          onDelete={deleteNote}
        />


        {/* Tasks */}
        <TasksSection onRefreshStats={refreshStats} />


        {/* Projects */}
        <ProjectsSection />


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
