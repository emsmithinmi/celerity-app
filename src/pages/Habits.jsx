import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHabitHistory } from '../lib/api/daily'
import { HABITS } from '../lib/constants'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDateMap(history) {
  const map = {}
  for (const row of history) map[row.date] = row
  return map
}

function computeCurrentStreak(dateMap, habitKey) {
  const today = new Date()
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toLocaleDateString('en-CA')
    const row = dateMap[dateStr]
    if (!row || !row[habitKey]) break
    streak++
  }
  return streak
}

function computePercent(dateMap, habitKey, days) {
  const today = new Date()
  let completed = 0, total = 0
  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toLocaleDateString('en-CA')
    const row = dateMap[dateStr]
    if (row) { total++; if (row[habitKey]) completed++ }
  }
  return total === 0 ? 0 : Math.round((completed / total) * 100)
}

function getLast7Days(dateMap, habitKey) {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toLocaleDateString('en-CA')
    const row = dateMap[dateStr]
    return { date: dateStr, done: !!(row && row[habitKey]) }
  })
}

// ─── Habit Card ───────────────────────────────────────────────────────────────

function HabitCard({ habit, dateMap, history, onClick }) {
  const streak  = computeCurrentStreak(dateMap, habit.key)
  const percent = computePercent(dateMap, habit.key, 30)
  const last7   = getLast7Days(dateMap, habit.key)

  const barColor = percent >= 70 ? 'var(--habit-done-bg)' : percent >= 40 ? 'var(--state-warning-text)' : 'var(--danger)'

  return (
    <div
      onClick={onClick}
      className="rounded-xl border p-4 cursor-pointer transition-opacity hover:opacity-80"
      style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
    >
      {/* Icon + name */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{habit.icon}</span>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{habit.label}</p>
      </div>

      {/* Streak */}
      <div className="mb-3">
        <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{streak}</p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>day streak</p>
      </div>

      {/* Last 7 days dots */}
      <div className="flex gap-1 mb-3">
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
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Habits() {
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1)
    getHabitHistory(yearAgo.toLocaleDateString('en-CA')).then(setHistory).finally(() => setLoading(false))
  }, [])

  const dateMap = useMemo(() => buildDateMap(history), [history])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Habits</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
          </div>
        ) : (
          <>
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
              Click a habit to see full history and stats
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {HABITS.map(habit => (
                <HabitCard
                  key={habit.key}
                  habit={habit}
                  dateMap={dateMap}
                  history={history}
                  onClick={() => navigate(`/habits/${habit.key}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
