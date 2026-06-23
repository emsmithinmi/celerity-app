import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHabits, createHabit, updateHabit, deleteHabit, getHabitHistory } from '../lib/api/habits'
import Button from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDateMap(history) {
  const map = {}
  for (const row of history) map[row.date] = row.entries ?? {}
  return map
}

function computeCurrentStreak(dateMap, habitKey) {
  const today = new Date()
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toLocaleDateString('en-CA')
    if (!dateMap[dateStr]?.[habitKey]) break
    streak++
  }
  return streak
}

function getLast7(dateMap, habitKey) {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toLocaleDateString('en-CA')
    return { date: dateStr, done: !!dateMap[dateStr]?.[habitKey] }
  })
}

function computePercent30(dateMap, habitKey) {
  const today = new Date()
  let completed = 0, total = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toLocaleDateString('en-CA')
    if (dateMap[dateStr] !== undefined) {
      total++
      if (dateMap[dateStr][habitKey]) completed++
    }
  }
  return total === 0 ? 0 : Math.round((completed / total) * 100)
}

// ─── Add Habit Modal ─────────────────────────────────────────────────────────

function AddHabitModal({ open, onClose, onAdd }) {
  const [label, setLabel] = useState('')
  const [targetDays, setTargetDays] = useState(7)
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!label.trim() || saving) return
    setSaving(true)
    try {
      await onAdd(label.trim(), targetDays)
      setLabel('')
      setTargetDays(7)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-sm rounded-2xl border p-6 space-y-4" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Add Habit</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name</label>
            <input
              autoFocus
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Exercise, Read, Meditate…"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none bg-transparent"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Target — {targetDays} day{targetDays !== 1 ? 's' : ''} per week
            </label>
            <div className="flex gap-1">
              {[1,2,3,4,5,6,7].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTargetDays(n)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: targetDays === n ? 'var(--accent)' : 'var(--border)',
                    color: targetDays === n ? 'var(--app-bg)' : 'var(--text-primary)',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" fullWidth onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" fullWidth disabled={!label.trim() || saving}>
              {saving ? 'Adding…' : 'Add Habit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Habit Card ───────────────────────────────────────────────────────────────

function HabitCard({ habit, dateMap, onEdit, onDelete, onClick }) {
  const streak  = computeCurrentStreak(dateMap, habit.key)
  const percent = computePercent30(dateMap, habit.key)
  const last7   = getLast7(dateMap, habit.key)
  const [editingTarget, setEditingTarget] = useState(false)

  const barColor = percent >= 70 ? 'var(--habit-done-bg)' : percent >= 40 ? 'var(--state-warning-text)' : 'var(--danger)'

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
    >
      {/* Name + delete */}
      <div className="flex items-start justify-between gap-2">
        <p
          className="text-sm font-medium cursor-pointer hover:opacity-70 transition-opacity flex-1"
          style={{ color: 'var(--text-primary)' }}
          onClick={onClick}
        >
          {habit.label}
        </p>
        <button
          onClick={onDelete}
          className="text-xs transition-opacity hover:opacity-60 shrink-0"
          style={{ color: 'var(--danger)', background: 'transparent' }}
          title="Remove habit"
        >
          ✕
        </button>
      </div>

      {/* Streak */}
      <div>
        <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{streak}</p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>day streak</p>
      </div>

      {/* Last 7 days dots */}
      <div className="flex gap-1">
        {last7.map(({ date, done }) => (
          <div
            key={date}
            className="flex-1 h-2 rounded-full"
            style={{ backgroundColor: done ? 'var(--habit-done-bg)' : 'var(--border)' }}
          />
        ))}
      </div>

      {/* 30-day % bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: barColor }} />
        </div>
        <span className="text-xs w-8 text-right" style={{ color: 'var(--text-secondary)' }}>{percent}%</span>
      </div>

      {/* Target days */}
      <div>
        {editingTarget ? (
          <div className="space-y-1.5">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Target per week:</p>
            <div className="flex gap-1">
              {[1,2,3,4,5,6,7].map(n => (
                <button
                  key={n}
                  onClick={() => { onEdit({ target_days: n }); setEditingTarget(false) }}
                  className="flex-1 py-1 rounded text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: habit.target_days === n ? 'var(--accent)' : 'var(--border)',
                    color: habit.target_days === n ? 'var(--app-bg)' : 'var(--text-primary)',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditingTarget(true)}
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-secondary)', background: 'transparent' }}
          >
            {habit.target_days}× per week — change
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Habits() {
  const navigate = useNavigate()
  const [habits,  setHabits]  = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1)
      const [h, hist] = await Promise.all([
        getHabits(),
        getHabitHistory(yearAgo.toLocaleDateString('en-CA')),
      ])
      setHabits(h)
      setHistory(hist)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const dateMap = useMemo(() => buildDateMap(history), [history])

  const handleAdd = async (label, targetDays) => {
    const newHabit = await createHabit(label, targetDays)
    setHabits(prev => [...prev, newHabit])
  }

  const handleEdit = async (habit, changes) => {
    const updated = await updateHabit(habit.id, changes)
    setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, ...updated } : h))
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteHabit(deleteTarget.id)
    setHabits(prev => prev.filter(h => h.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Habits</h1>
        <Button size="sm" variant="primary" onClick={() => setShowAdd(true)}>+ Add Habit</Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
          </div>
        ) : habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-3">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No habits yet.</p>
            <Button size="sm" variant="secondary" onClick={() => setShowAdd(true)}>Add your first habit</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {habits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                dateMap={dateMap}
                onEdit={changes => handleEdit(habit, changes)}
                onDelete={() => setDeleteTarget(habit)}
                onClick={() => navigate(`/habits/${habit.key}`)}
              />
            ))}
          </div>
        )}
      </div>

      <AddHabitModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={handleAdd}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Remove "${deleteTarget?.label}"?`}
        message="This deletes the habit. Your past completion history is kept."
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  )
}
