import { useState, useEffect, useRef } from 'react'
import { Plus, X, CheckCircle2, Circle } from 'lucide-react'
import { useDaily } from '../hooks/useDaily'
import { supabase } from '../lib/supabase'
import { HABITS } from '../lib/constants'
import { Button } from '../components/ui'

// Timezone-safe local date string
function localDateStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const TODAY = localDateStr()

const TODAY_FMT = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
})

// ─── Debounced textarea ────────────────────────────────────────────────────────

function DebouncedTextarea({ value, onSave, placeholder, rows = 4 }) {
  const [local, setLocal]   = useState(value ?? '')
  const mounted             = useRef(false)
  const onSaveRef           = useRef(onSave)
  useEffect(() => { onSaveRef.current = onSave }, [onSave])

  // Sync when note first loads from DB
  useEffect(() => { setLocal(value ?? '') }, [value])

  // Debounced write — skip first mount
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    const t = setTimeout(() => onSaveRef.current(local), 800)
    return () => clearTimeout(t)
  }, [local])

  return (
    <textarea
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2.5 text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-highlight resize-none"
    />
  )
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, count, icon, accent }) {
  return (
    <div
      className="bg-app-pane border border-app-border rounded-xl p-4"
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
}

// ─── Habit row ─────────────────────────────────────────────────────────────────

function HabitRow({ habit, checked, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl border transition-colors ${
        checked
          ? 'bg-app-highlight/10 border-app-highlight text-app-text'
          : 'bg-app-pane border-app-border text-app-muted hover:border-app-highlight/50'
      }`}
    >
      {checked
        ? <CheckCircle2 size={18} className="text-app-highlight flex-shrink-0" />
        : <Circle      size={18} className="opacity-40 flex-shrink-0" />
      }
      <span className="text-sm font-medium">{habit.label}</span>
    </button>
  )
}

// ─── Top of Mind ───────────────────────────────────────────────────────────────

function TopOfMind({ items, onUpdate }) {
  const [input, setInput] = useState('')

  const add = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    onUpdate([...items, trimmed])
    setInput('')
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="What's on your mind today?"
          className="flex-1 bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-highlight"
        />
        <Button variant="secondary" size="sm" onClick={add} disabled={!input.trim()}>
          <Plus size={14} />
        </Button>
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 bg-app-pane border border-app-border rounded-lg px-3 py-2.5 group"
            >
              <span className="text-app-highlight font-bold text-sm flex-shrink-0 mt-px">
                {i + 1}.
              </span>
              <span className="text-sm text-app-text flex-1">{item}</span>
              <button
                onClick={() => onUpdate(items.filter((_, idx) => idx !== i))}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-app-muted hover:text-red-400 flex-shrink-0"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Daily page ────────────────────────────────────────────────────────────────

export default function Daily() {
  const { note, loading, updateField } = useDaily(TODAY)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      const [tasksRes, projectsRes] = await Promise.all([
        supabase.from('tasks').select('status, due_date').neq('status', 'done'),
        supabase.from('projects').select('status').eq('status', 'in_progress'),
      ])
      const tasks = tasksRes.data || []
      setStats({
        nextActions:    tasks.filter((t) => t.status === 'next_action').length,
        waiting:        tasks.filter((t) => t.status === 'waiting').length,
        dueToday:       tasks.filter((t) => t.due_date === TODAY).length,
        inbox:          tasks.filter((t) => t.status === 'inbox').length,
        activeProjects: (projectsRes.data || []).length,
      })
    }
    fetchStats()
  }, [])

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-app-text">Daily Note</h1>
        <p className="text-app-muted text-sm mt-0.5">{TODAY_FMT}</p>
      </div>

      {/* Stat cards — always visible */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <StatCard label="Next Actions"    count={stats?.nextActions}    icon="⚡" accent="#0F9D58" />
        <StatCard label="Waiting On"      count={stats?.waiting}        icon="⏳" accent="#DB4437" />
        <StatCard label="Due Today"       count={stats?.dueToday}       icon="📅" accent="#ADE8F4" />
        <StatCard label="In Inbox"        count={stats?.inbox}          icon="📥" accent="#FBBC05" />
        <StatCard label="Active Projects" count={stats?.activeProjects} icon="🗂" accent="#1967D2" />
      </div>

      {/* Daily note body */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-app-pane border border-app-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : note ? (
        <div className="space-y-8">

          {/* Habits */}
          <section>
            <h2 className="text-xs font-semibold text-app-muted uppercase tracking-widest mb-3">
              Habits
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HABITS.map((habit) => (
                <HabitRow
                  key={habit.key}
                  habit={habit}
                  checked={!!note[habit.key]}
                  onToggle={() => updateField(habit.key, !note[habit.key])}
                />
              ))}
            </div>
          </section>

          {/* Top of Mind */}
          <section>
            <h2 className="text-xs font-semibold text-app-muted uppercase tracking-widest mb-3">
              Top of Mind
            </h2>
            <TopOfMind
              items={note.top_of_mind || []}
              onUpdate={(items) => updateField('top_of_mind', items)}
            />
          </section>

          {/* Quote / Intention */}
          <section>
            <h2 className="text-xs font-semibold text-app-muted uppercase tracking-widest mb-3">
              Quote / Intention
            </h2>
            <DebouncedTextarea
              value={note.quote}
              onSave={(val) => updateField('quote', val || null)}
              placeholder="A quote or intention for today…"
              rows={2}
            />
          </section>

          {/* Notes */}
          <section>
            <h2 className="text-xs font-semibold text-app-muted uppercase tracking-widest mb-3">
              Notes
            </h2>
            <DebouncedTextarea
              value={note.notes}
              onSave={(val) => updateField('notes', val || null)}
              placeholder="Brain dump, reflections, anything…"
              rows={6}
            />
          </section>

        </div>
      ) : (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
          Failed to load today's note.
        </p>
      )}
    </div>
  )
}
