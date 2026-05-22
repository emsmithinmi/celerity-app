import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { TaskCard } from '../components/tasks'
import { TaskDetail } from '../components/tasks'
import { StatusPill, PriorityBadge, Drawer } from '../components/ui'

function localDateStr() {
  const d   = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const TODAY = localDateStr()

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const TODAY_FMT = new Date().toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric',
})

// ─── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({ label, count, icon, accent, to }) {
  const inner = (
    <div
      className="bg-app-pane border border-app-border rounded-xl p-4 hover:border-app-highlight/50 transition-colors"
      style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
    >
      <p className="text-xs text-app-muted mb-2 flex items-center gap-1.5">
        <span aria-hidden="true">{icon}</span>
        {label}
      </p>
      <p className="text-2xl font-bold text-app-text tabular-nums">
        {count ?? '—'}
      </p>
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

// ─── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, count, to, toLabel = 'See all' }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-semibold text-app-muted uppercase tracking-widest">
        {title}
        {count != null && (
          <span className="font-normal normal-case tracking-normal ml-2">({count})</span>
        )}
      </h2>
      {to && (
        <Link
          to={to}
          className="flex items-center gap-1 text-xs text-app-link hover:text-app-text transition-colors"
        >
          {toLabel}
          <ArrowRight size={11} />
        </Link>
      )}
    </div>
  )
}

// ─── Project row ───────────────────────────────────────────────────────────────

function ProjectRow({ project }) {
  return (
    <div className="bg-app-pane border border-app-border rounded-xl px-4 py-3 flex items-center gap-3">
      <StatusPill status={project.status} type="project" />
      <span className="text-sm font-medium text-app-text flex-1 truncate">{project.title}</span>
      {project.priority && project.priority !== 'routine' && (
        <PriorityBadge priority={project.priority} />
      )}
      {project.area && (
        <span className="text-xs text-app-muted hidden sm:block">{project.area}</span>
      )}
    </div>
  )
}

// ─── Dashboard page ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data,         setData]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [selectedTask, setSelectedTask] = useState(null)

  useEffect(() => {
    const fetchAll = async () => {
      const [tasksRes, projectsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*, projects(id, title)')
          .neq('status', 'done')
          .order('created_at', { ascending: false }),
        supabase
          .from('projects')
          .select('*')
          .eq('status', 'in_progress')
          .order('updated_at', { ascending: false }),
      ])

      const tasks    = tasksRes.data    || []
      const projects = projectsRes.data || []

      setData({
        stats: {
          nextActions:    tasks.filter((t) => t.status === 'next_action').length,
          waiting:        tasks.filter((t) => t.status === 'waiting').length,
          dueToday:       tasks.filter((t) => t.due_date === TODAY).length,
          inbox:          tasks.filter((t) => t.status === 'inbox').length,
          activeProjects: projects.length,
        },
        nextActions: tasks.filter((t) => t.status === 'next_action').slice(0, 5),
        dueToday:    tasks.filter((t) => t.due_date === TODAY),
        inbox:       tasks.filter((t) => t.status === 'inbox').slice(0, 5),
        projects,
      })
      setLoading(false)
    }
    fetchAll()
  }, [])

  const handleTaskUpdate = async (id, updates) => {
    const { data: updated } = await supabase
      .from('tasks').update(updates).eq('id', id).select().single()
    if (updated && selectedTask?.id === id) setSelectedTask(updated)
    return { data: updated }
  }

  const handleTaskDelete = async (id) => {
    await supabase.from('tasks').delete().eq('id', id)
    setSelectedTask(null)
  }

  const { stats, nextActions, dueToday, inbox, projects } = data || {}

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-app-text">{greeting()}</h1>
        <Link to="/daily" className="text-app-muted text-sm hover:text-app-link transition-colors">
          {TODAY_FMT} — open today's note →
        </Link>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mb-10">
        <StatTile label="Next Actions"    count={stats?.nextActions}    icon="⚡" accent="#0F9D58" to="/tasks" />
        <StatTile label="Waiting On"      count={stats?.waiting}        icon="⏳" accent="#DB4437" to="/tasks" />
        <StatTile label="Due Today"       count={stats?.dueToday}       icon="📅" accent="#ADE8F4" to="/tasks" />
        <StatTile label="In Inbox"        count={stats?.inbox}          icon="📥" accent="#FBBC05" to="/tasks" />
        <StatTile label="Active Projects" count={stats?.activeProjects} icon="🗂" accent="#1967D2" to="/projects" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-app-pane border border-app-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">

          {/* Next Actions */}
          {nextActions?.length > 0 && (
            <section>
              <SectionHeader title="Next Actions" count={stats.nextActions} to="/tasks" />
              <div className="space-y-2">
                {nextActions.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                ))}
              </div>
            </section>
          )}

          {/* Due Today */}
          {dueToday?.length > 0 && (
            <section>
              <SectionHeader title="Due Today" count={dueToday.length} to="/tasks" />
              <div className="space-y-2">
                {dueToday.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                ))}
              </div>
            </section>
          )}

          {/* Active Projects */}
          {projects?.length > 0 && (
            <section>
              <SectionHeader title="Active Projects" count={projects.length} to="/projects" />
              <div className="space-y-2">
                {projects.map((proj) => (
                  <ProjectRow key={proj.id} project={proj} />
                ))}
              </div>
            </section>
          )}

          {/* Inbox */}
          {inbox?.length > 0 && (
            <section>
              <SectionHeader
                title="Inbox"
                count={stats.inbox}
                to="/tasks"
                toLabel={stats.inbox > 5 ? `Process all ${stats.inbox}` : 'Go to Tasks'}
              />
              <div className="space-y-2">
                {inbox.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                ))}
              </div>
            </section>
          )}

          {/* All clear */}
          {!nextActions?.length && !dueToday?.length && !inbox?.length && !projects?.length && (
            <div className="text-center py-20">
              <p className="text-app-muted text-sm">All clear — nothing to show.</p>
            </div>
          )}

        </div>
      )}

      {/* Task detail drawer */}
      <Drawer
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title="Task Detail"
        width="md"
      >
        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            onUpdate={handleTaskUpdate}
            onDelete={handleTaskDelete}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </Drawer>
    </div>
  )
}
