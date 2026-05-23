import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDailyStats, getTodayNote } from '../lib/api/daily'
import { getProjects } from '../lib/api/projects'
import { getPeople }   from '../lib/api/people'
import { supabase }    from '../lib/supabase'
import { StatusPill, PriorityBadge } from '../components/ui'
import Button from '../components/ui/Button'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function formatDate(d) {
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target - today) / (1000 * 60 * 60 * 24))
}

function dueLabelColor(days) {
  if (days < 0)  return '#DB4437'   // overdue
  if (days === 0) return '#FBBC05'  // today
  if (days <= 2)  return '#E8710A'  // soon
  return '#6c7086'                  // normal
}

function dueLabelText(days) {
  if (days < 0)  return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `${days} days`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DashCard({ title, children, action, onAction }) {
  return (
    <div
      className="rounded-xl border flex flex-col"
      style={{ backgroundColor: '#181825', borderColor: '#313244' }}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6c7086' }}>
          {title}
        </h3>
        {action && (
          <button
            onClick={onAction}
            className="text-xs transition-colors"
            style={{ color: '#6c7086' }}
            onMouseEnter={e => e.target.style.color = '#89b4fa'}
            onMouseLeave={e => e.target.style.color = '#6c7086'}
          >
            {action}
          </button>
        )}
      </div>
      <div className="px-4 pb-4 flex-1">
        {children}
      </div>
    </div>
  )
}

function StatChip({ icon, value, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-3 rounded-xl border flex-1 min-w-0 transition-opacity hover:opacity-80"
      style={{ backgroundColor: '#181825', borderColor: '#313244' }}
    >
      <span className="text-xl shrink-0">{icon}</span>
      <div className="min-w-0 text-left">
        <p className="text-xl font-bold leading-none" style={{ color }}>{value}</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: '#6c7086' }}>{label}</p>
      </div>
    </button>
  )
}

function EmptyNote({ text }) {
  return <p className="text-sm" style={{ color: '#45475a' }}>{text}</p>
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const now = new Date()

  const [loading,      setLoading]      = useState(true)
  const [stats,        setStats]        = useState({})
  const [topOfMind,    setTopOfMind]    = useState([])
  const [nextActions,  setNextActions]  = useState([])
  const [dueSoon,      setDueSoon]      = useState([])
  const [activeProj,   setActiveProj]   = useState([])
  const [stalledProj,  setStalledProj]  = useState([])
  const [staleContacts,setStaleContacts]= useState([])

  useEffect(() => {
    const today   = now.toISOString().split('T')[0]
    const in7days = new Date(now); in7days.setDate(in7days.getDate() + 7)
    const in7Str  = in7days.toISOString().split('T')[0]

    Promise.all([
      getDailyStats(),
      getTodayNote(),
      supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, projects(title)')
        .eq('status', 'next_action')
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, projects(title)')
        .neq('status', 'done')
        .not('due_date', 'is', null)
        .lte('due_date', in7Str)
        .order('due_date', { ascending: true })
        .limit(8),
      getProjects({ status: 'in_progress' }),
      getProjects({ status: 'stalled'     }),
      getPeople({ status: 'stale' }),
    ]).then(([st, note, na, ds, ap, sp, sc]) => {
      setStats(st)
      setTopOfMind(note?.top_of_mind ?? [])
      setNextActions(na.data ?? [])
      setDueSoon(ds.data ?? [])
      setActiveProj(ap)
      setStalledProj(sp)
      setStaleContacts(sc)
    }).finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: '#6c7086' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">

        {/* ── Header ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#6c7086' }}>
            Dashboard
          </p>
          <h1 className="text-2xl font-bold" style={{ color: '#cdd6f4' }}>
            {formatDate(now)}
          </h1>
        </div>

        {/* ── Stat chips ── */}
        <div className="flex gap-3 flex-wrap">
          <StatChip icon="📁" value={stats.inProgress  ?? 0} label="In Progress"   color="#89b4fa"  onClick={() => navigate('/projects?tab=in_progress')} />
          <StatChip icon="⚡" value={stats.nextActions ?? 0} label="Next Actions"  color="#a6e3a1"  onClick={() => navigate('/tasks?tab=next_action')} />
          <StatChip icon="⏳" value={stats.waiting     ?? 0} label="Waiting"       color="#f38ba8"  onClick={() => navigate('/tasks?tab=waiting')} />
          <StatChip icon="📅" value={stats.dueToday    ?? 0} label="Due Today"     color="#f9e2af"  onClick={() => navigate('/tasks')} />
          <StatChip icon="⚠" value={stats.stalled     ?? 0} label="Stalled"       color="#cba6f7"  onClick={() => navigate('/projects?tab=stalled')} />
        </div>

        {/* ── Main 2-col grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Top of Mind */}
          <DashCard title="📌 Top of Mind" action="Edit →" onAction={() => navigate('/daily')}>
            {topOfMind.length === 0 ? (
              <EmptyNote text="No top of mind set for today." />
            ) : (
              <ul className="space-y-1.5">
                {topOfMind.slice(0, 5).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#cdd6f4' }}>
                    <span style={{ color: '#89b4fa' }}>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </DashCard>

          {/* Active Projects */}
          <DashCard
            title={`📁 Active Projects (${activeProj.length + stalledProj.length})`}
            action="All Projects →"
            onAction={() => navigate('/projects')}
          >
            {activeProj.length === 0 && stalledProj.length === 0 ? (
              <EmptyNote text="No active projects." />
            ) : (
              <div className="space-y-2">
                {activeProj.slice(0, 4).map(p => (
                  <div key={p.id} className="flex items-center gap-2">
                    <StatusPill status={p.status} type="project" />
                    <span className="text-sm flex-1 truncate" style={{ color: '#cdd6f4' }}>{p.title}</span>
                    {p.area && <span className="text-xs shrink-0" style={{ color: '#6c7086' }}>{p.area}</span>}
                  </div>
                ))}
                {stalledProj.slice(0, 2).map(p => (
                  <div key={p.id} className="flex items-center gap-2">
                    <StatusPill status={p.status} type="project" />
                    <span className="text-sm flex-1 truncate" style={{ color: '#cba6f7' }}>{p.title}</span>
                    <span className="text-xs shrink-0" style={{ color: '#cba6f7' }}>stalled</span>
                  </div>
                ))}
                {(activeProj.length + stalledProj.length) > 6 && (
                  <p className="text-xs" style={{ color: '#45475a' }}>
                    +{activeProj.length + stalledProj.length - 6} more
                  </p>
                )}
              </div>
            )}
          </DashCard>

          {/* Next Actions */}
          <DashCard
            title={`⚡ Next Actions (${stats.nextActions ?? 0})`}
            action="All Tasks →"
            onAction={() => navigate('/tasks?tab=next_action')}
          >
            {nextActions.length === 0 ? (
              <EmptyNote text="No next actions — inbox is clear!" />
            ) : (
              <div className="space-y-2">
                {nextActions.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: '#0F9D58' }}
                    />
                    <span className="text-sm flex-1 truncate" style={{ color: '#cdd6f4' }}>{t.title}</span>
                    {t.projects?.title && (
                      <span className="text-xs shrink-0 truncate max-w-20" style={{ color: '#6c7086' }}>
                        {t.projects.title}
                      </span>
                    )}
                    <PriorityBadge priority={t.priority} />
                  </div>
                ))}
              </div>
            )}
          </DashCard>

          {/* Due Soon */}
          <DashCard
            title="📅 Due This Week"
            action="All Tasks →"
            onAction={() => navigate('/tasks')}
          >
            {dueSoon.length === 0 ? (
              <EmptyNote text="Nothing due in the next 7 days." />
            ) : (
              <div className="space-y-2">
                {dueSoon.map(t => {
                  const days  = daysUntil(t.due_date)
                  const color = dueLabelColor(days)
                  return (
                    <div key={t.id} className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm flex-1 truncate" style={{ color: '#cdd6f4' }}>{t.title}</span>
                      <span className="text-xs shrink-0" style={{ color }}>
                        {dueLabelText(days)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </DashCard>
        </div>

        {/* ── Stale contacts (only shown if any) ── */}
        {staleContacts.length > 0 && (
          <DashCard
            title={`👥 Stale Contacts (${staleContacts.length})`}
            action="View People →"
            onAction={() => navigate('/people?tab=stale')}
          >
            <div className="flex flex-wrap gap-2">
              {staleContacts.map(p => {
                const name = p.preferred_name
                  ? `${p.preferred_name} ${p.last_name}`
                  : `${p.first_name} ${p.last_name}`
                const initials = `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase()
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                    style={{ backgroundColor: '#1e1e2e', borderColor: '#313244' }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                      style={{ backgroundColor: '#313244', color: '#6c7086' }}
                    >
                      {initials}
                    </div>
                    <span className="text-sm" style={{ color: '#6c7086' }}>{name}</span>
                  </div>
                )
              })}
            </div>
          </DashCard>
        )}

        {/* ── Quick links ── */}
        <div className="flex gap-2 flex-wrap pb-4">
          {[
            { label: '📋 Daily Review',  to: '/reviews/daily'   },
            { label: '📅 Weekly Review', to: '/reviews/weekly'  },
            { label: '📆 Monthly Review',to: '/reviews/monthly' },
          ].map(({ label, to }) => (
            <Button key={to} variant="action" size="sm" onClick={() => navigate(to)}>
              {label}
            </Button>
          ))}
        </div>

      </div>
    </div>
  )
}
