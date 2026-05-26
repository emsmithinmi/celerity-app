import { useState } from 'react'
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
  return new Date().toISOString().split('T')[0]
}

function shiftDate(dateStr, days) {
  // Use noon local time to avoid daylight-saving edge cases
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
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
          style={{ width: 32, height: 32, color: '#6c7086', backgroundColor: '#313244' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#45475a'; e.currentTarget.style.color = '#cdd6f4' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#313244'; e.currentTarget.style.color = '#6c7086' }}
          title="Previous day"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Day name */}
        <p className="text-4xl font-normal tracking-widest uppercase w-64 text-center" style={{ color: '#FB9039' }}>
          {DAYS[d.getDay()]}
        </p>

        <button
          onClick={onNext}
          className="flex items-center justify-center rounded-lg transition-colors"
          style={{ width: 32, height: 32, color: '#6c7086', backgroundColor: '#313244' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#45475a'; e.currentTarget.style.color = '#cdd6f4' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#313244'; e.currentTarget.style.color = '#6c7086' }}
          title="Next day"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Divider line */}
      <div className="my-2 h-px mx-auto w-20" style={{ backgroundColor: '#313244' }} />

      {/* Full date */}
      <h1 className="text-5xl font-bold" style={{ color: '#cdd6f4' }}>
        {MONTHS[d.getMonth()]} {d.getDate()}, {d.getFullYear()}
      </h1>

      {/* "Today" pill — only visible when browsing another day */}
      {!isToday && (
        <div className="flex justify-center mt-4">
          <button
            onClick={onToday}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={{ backgroundColor: '#FB9039', color: '#1e1e2e' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e07820'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FB9039'}
          >
            ↩ Back to Today
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return <hr style={{ borderColor: '#313244' }} />
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

  // Agenda data — scoped to selected date
  const { tasks: scheduledTasks }   = useTasks({ status: 'scheduled' })
  const { projects: startOnDate }   = useProjects({ start_date: selectedDate })
  const { projects: endOnDate }     = useProjects({ end_date: selectedDate })
  const projectDates = [...(startOnDate ?? []), ...(endOnDate ?? [])]

  // Modal state
  const [modal, setModal] = useState(null)

  const handleChallengeUpdate = async (updated) => {
    if (!note) return
    await updateChallenge(note.id, updated)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: '#6c7086' }}>Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: '#DB4437' }}>Error: {error}</p>
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
        <DailyQuote dateStr={selectedDate} />
        <Divider />

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
        <Divider />

        {/* Top of Mind */}
        <TopOfMind
          items={note?.top_of_mind ?? []}
          onSave={updateTopOfMind}
        />
        <Divider />

        {/* Agenda */}
        <AgendaSection
          scheduledTasks={scheduledTasks}
          projectDates={projectDates}
        />
        <Divider />

        {/* Projects */}
        <ProjectsSection />
        <Divider />

        {/* Tasks */}
        <TasksSection onRefreshStats={refreshStats} />
        <Divider />

        {/* Notes */}
        <NotesSection
          notes={note?.notes ?? []}
          onAdd={addNote}
          onEdit={editNote}
          onDelete={deleteNote}
        />
        <Divider />

        {/* Habits */}
        <HabitsSection
          note={note}
          habitHistory={habitHistory}
          onToggle={toggleHabit}
        />
        <Divider />

        {/* Daily Challenge */}
        <ChallengeSection
          challenge={note?.code_challenge}
          onUpdate={handleChallengeUpdate}
        />
        <Divider />

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
