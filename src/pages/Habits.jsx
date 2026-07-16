import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHabits, createHabit, updateHabit, deleteHabit, getHabitHistory } from '../lib/api/habits'
import Button from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DOW_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DOW_NAMES   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DOW_SHORT   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function describeWeekdays(weekdays) {
  if (weekdays.length === 7) return 'Every day'
  return [...weekdays].sort((a, b) => a - b).map(d => DOW_SHORT[d]).join(', ')
}

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

function getThisWeekDates() {
  const today = new Date()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return d.toLocaleDateString('en-CA')
  })
}

function computeWeekCount(dateMap, habitKey, weekDates, targetWeekdays) {
  return weekDates.filter((d, i) => targetWeekdays.includes(i) && !!dateMap[d]?.[habitKey]).length
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
  const [targetWeekdays, setTargetWeekdays] = useState([0, 1, 2, 3, 4, 5, 6])
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const toggleDay = (i) => {
    setTargetWeekdays(prev => {
      if (prev.includes(i)) {
        if (prev.length === 1) return prev
        return prev.filter(d => d !== i)
      }
      return [...prev, i].sort((a, b) => a - b)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!label.trim() || saving) return
    setSaving(true)
    try {
      await onAdd(label.trim(), targetWeekdays)
      setLabel('')
      setTargetWeekdays([0, 1, 2, 3, 4, 5, 6])
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
              Which days — {describeWeekdays(targetWeekdays)}
            </label>
            <div className="flex gap-1">
              {DOW_LETTERS.map((letter, i) => (
                <button
                  key={i}
                  type="button"
                  title={DOW_NAMES[i]}
                  onClick={() => toggleDay(i)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: targetWeekdays.includes(i) ? 'var(--accent)' : 'var(--border)',
                    color: targetWeekdays.includes(i) ? 'var(--app-bg)' : 'var(--text-primary)',
                  }}
                >
                  {letter}
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

const THIS_WEEK = getThisWeekDates()

function HabitCard({ habit, dateMap, onEdit, onDelete, onClick }) {
  const today      = new Date().toLocaleDateString('en-CA')
  const streak     = computeCurrentStreak(dateMap, habit.key)
  const weekdays   = habit.target_weekdays ?? [0, 1, 2, 3, 4, 5, 6]
  const target     = weekdays.length
  const weekCount  = computeWeekCount(dateMap, habit.key, THIS_WEEK, weekdays)
  const [editingTarget, setEditingTarget] = useState(false)

  const toggleWeekday = (i) => {
    if (weekdays.includes(i)) {
      if (weekdays.length === 1) return
      onEdit({ target_weekdays: weekdays.filter(d => d !== i).sort((a, b) => a - b) })
    } else {
      onEdit({ target_weekdays: [...weekdays, i].sort((a, b) => a - b) })
    }
  }

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

      {/* This week: day-of-week strip */}
      <div className="space-y-1">
        <div className="flex gap-1">
          {THIS_WEEK.map((dateStr, i) => {
            const isTarget = weekdays.includes(i)
            const isDone   = !!dateMap[dateStr]?.[habit.key]
            const isToday  = dateStr === today
            return (
              <div
                key={i}
                title={DOW_NAMES[i]}
                className="flex-1 flex items-center justify-center rounded text-[10px] font-medium"
                style={{
                  height: 20,
                  outline: isToday ? '1.5px solid var(--accent)' : 'none',
                  outlineOffset: -1.5,
                  backgroundColor: !isTarget ? 'transparent' : isDone ? 'var(--habit-done-bg)' : 'var(--border)',
                  color: !isTarget ? 'var(--text-dim)' : isDone ? '#000' : 'var(--text-secondary)',
                  opacity: isTarget ? 1 : 0.4,
                }}
              >
                {DOW_LETTERS[i]}
              </div>
            )
          })}
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {weekCount} of {target} this week
        </p>
      </div>

      {/* Target days */}
      <div>
        {editingTarget ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Which days:</p>
              <button
                onClick={() => setEditingTarget(false)}
                className="text-xs transition-opacity hover:opacity-70"
                style={{ color: 'var(--accent)', background: 'transparent' }}
              >
                Done
              </button>
            </div>
            <div className="flex gap-1">
              {DOW_LETTERS.map((letter, i) => (
                <button
                  key={i}
                  title={DOW_NAMES[i]}
                  onClick={() => toggleWeekday(i)}
                  className="flex-1 py-1 rounded text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: weekdays.includes(i) ? 'var(--accent)' : 'var(--border)',
                    color: weekdays.includes(i) ? 'var(--app-bg)' : 'var(--text-primary)',
                  }}
                >
                  {letter}
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
            {describeWeekdays(weekdays)} — change
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

  const handleAdd = async (label, targetWeekdays) => {
    const newHabit = await createHabit(label, targetWeekdays)
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
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Habits Dashboard</h1>
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
