import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

// ─── Date header helpers ──────────────────────────────────────────────────────
const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function DateHeader() {
  const now = new Date()
  return (
    <div className="text-center py-4">
      <p className="text-4xl font-normal tracking-widest uppercase" style={{ color: '#FB9039' }}>
        {DAYS[now.getDay()]}
      </p>
      <div className="my-3 h-px mx-auto w-20" style={{ backgroundColor: '#313244' }} />
      <h1 className="text-5xl font-bold" style={{ color: '#cdd6f4' }}>
        {MONTHS[now.getMonth()]} {now.getDate()}, {now.getFullYear()}
      </h1>
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
  const { note, habitHistory, stats, loading, error, toggleHabit, addNote, editNote, deleteNote, updateTopOfMind, refreshStats } = useDaily()

  // Quick capture hooks (separate from the section hooks so modals don't re-render sections)
  const { createTask }    = useTasksCapture({})
  const { createProject } = useProjectsCapture({})

  // Agenda data
  const today = new Date().toISOString().split('T')[0]
  const { tasks: scheduledTasks }  = useTasks({ status: 'scheduled' })
  const { projects: startToday }   = useProjects({ start_date: today })
  const { projects: endToday }     = useProjects({ end_date: today })
  const projectDates = [...(startToday ?? []), ...(endToday ?? [])]

  // Modal state
  const [modal, setModal] = useState(null) // 'task' | 'project' | 'person' | 'note'

  const handleChallengeUpdate = async (updated) => {
    if (!note) return
    await updateChallenge(note.id, updated)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: '#6c7086' }}>Loading your day…</p>
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

        {/* Date */}
        <DateHeader />
        <DailyQuote />
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
