import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getHabitHistory } from '../lib/api/daily'
import { HABITS } from '../lib/constants'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDateMap(history) {
  const map = {}
  for (const row of history) map[row.date] = row
  return map
}

function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7 // Mon=0…Sun=6
  const days = []
  for (let i = 0; i < startDow; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d).toLocaleDateString('en-CA'))
  }
  while (days.length % 7 !== 0) days.push(null)
  return days
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

function computeLongestStreak(history, habitKey) {
  let longest = 0, current = 0
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
  let prevDate = null
  for (const row of sorted) {
    if (!row[habitKey]) { current = 0; prevDate = null; continue }
    if (prevDate) {
      const diff = (new Date(row.date) - new Date(prevDate)) / 86400000
      current = diff === 1 ? current + 1 : 1
    } else {
      current = 1
    }
    prevDate = row.date
    if (current > longest) longest = current
  }
  return longest
}

function getTimeframeRange(key) {
  const today = new Date()
  const todayStr = today.toLocaleDateString('en-CA')
  if (key === 'today') return { start: todayStr, end: todayStr }
  if (key === 'week') {
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay()) // Sunday = 0
    return { start: weekStart.toLocaleDateString('en-CA'), end: todayStr }
  }
  if (key === 'month') {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    return { start: monthStart.toLocaleDateString('en-CA'), end: todayStr }
  }
  // year
  const yearStart = new Date(today.getFullYear(), 0, 1)
  return { start: yearStart.toLocaleDateString('en-CA'), end: todayStr }
}

function computePercent(dateMap, habitKey, timeframeKey) {
  const { start, end } = getTimeframeRange(timeframeKey)
  if (timeframeKey === 'today') {
    const row = dateMap[start]
    return row ? (row[habitKey] ? 100 : 0) : null
  }
  let completed = 0, total = 0
  let d = new Date(start + 'T12:00:00')
  const endDate = new Date(end + 'T12:00:00')
  while (d <= endDate) {
    const dateStr = d.toLocaleDateString('en-CA')
    const row = dateMap[dateStr]
    if (row) { total++; if (row[habitKey]) completed++ }
    d.setDate(d.getDate() + 1)
  }
  return total === 0 ? 0 : Math.round((completed / total) * 100)
}

// ─── Components ───────────────────────────────────────────────────────────────

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const TIMEFRAMES = [
  { key: 'today', label: 'Today'      },
  { key: 'week',  label: 'This Week'  },
  { key: 'month', label: 'This Month' },
  { key: 'year',  label: 'This Year'  },
]

function HabitCalendar({ habitKey, calYear, calMonth, dateMap, onPrev, onNext }) {
  const grid  = useMemo(() => buildCalendarGrid(calYear, calMonth), [calYear, calMonth])
  const today = new Date().toLocaleDateString('en-CA')

  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrev}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
        >
          ← Prev
        </button>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {MONTHS[calMonth]} {calYear}
        </h3>
        <button
          onClick={onNext}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
        >
          Next →
        </button>
      </div>

      {/* DOW header */}
      <div className="grid grid-cols-7 mb-2">
        {DOW_LABELS.map(d => (
          <div key={d} className="text-center text-xs font-medium py-1" style={{ color: 'var(--text-secondary)' }}>{d}</div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1">
        {grid.map((dateStr, idx) => {
          if (!dateStr) return <div key={`empty-${idx}`} />
          const row      = dateMap[dateStr]
          const done     = !!(row && row[habitKey])
          const isToday  = dateStr === today
          const isFuture = dateStr > today
          const dayNum   = parseInt(dateStr.split('-')[2], 10)

          return (
            <div
              key={dateStr}
              className="flex flex-col items-center justify-center rounded-lg py-1.5 gap-0.5"
              style={{
                backgroundColor: isToday ? 'var(--card-task-bg)' : 'transparent',
                outline: isToday ? '1px solid var(--accent)' : 'none',
                minHeight: '48px',
              }}
            >
              <span className="text-xs" style={{ color: isToday ? 'var(--accent)' : isFuture ? 'var(--text-dim)' : 'var(--text-primary)' }}>
                {dayNum}
              </span>
              {!isFuture && row && (
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: done ? 'var(--habit-done-bg)' : 'var(--border)' }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--habit-done-bg)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Done</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Missed</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HabitPage() {
  const { habit: habitKey } = useParams()
  const navigate = useNavigate()

  const habit = HABITS.find(h => h.key === habitKey)

  const today = new Date()
  const [history,   setHistory]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [timeframe, setTimeframe] = useState('week')
  const [calYear,   setCalYear]   = useState(today.getFullYear())
  const [calMonth,  setCalMonth]  = useState(today.getMonth())

  useEffect(() => {
    setLoading(true)
    const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1)
    getHabitHistory(yearAgo.toLocaleDateString('en-CA')).then(setHistory).finally(() => setLoading(false))
  }, [])

  const dateMap = useMemo(() => buildDateMap(history), [history])

  const currentStreak = useMemo(() => computeCurrentStreak(dateMap, habitKey), [dateMap, habitKey])
  const longestStreak = useMemo(() => computeLongestStreak(history, habitKey), [history, habitKey])
  const percent       = useMemo(() => computePercent(dateMap, habitKey, timeframe), [dateMap, habitKey, timeframe])

  const barColor = percent === null ? 'var(--text-dim)' : percent >= 70 ? 'var(--habit-done-bg)' : percent >= 40 ? 'var(--state-warning-text)' : 'var(--danger)'

  const handlePrevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  const handleNextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  if (!habit) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: 'var(--danger)' }}>Habit not found.</p>
    </div>
  )

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb header */}
      <div
        className="flex items-center gap-3 px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          onClick={() => navigate('/habits')}
          className="text-sm transition-opacity hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← Habits
        </button>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span className="text-xl">{habit.icon}</span>
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{habit.label}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
          </div>
        ) : (
          <>
            {/* Streak stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border p-4 text-center" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
                <p className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>{currentStreak}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Current Streak</p>
              </div>
              <div className="rounded-xl border p-4 text-center" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
                <p className="text-3xl font-bold" style={{ color: 'var(--accent-purple)' }}>{longestStreak}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Best Streak</p>
              </div>
              <div className="rounded-xl border p-4 text-center" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
                <p className="text-3xl font-bold" style={{ color: barColor }}>
                  {percent === null ? '—' : timeframe === 'today' ? (percent === 100 ? '✓' : '✗') : `${percent}%`}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {TIMEFRAMES.find(t => t.key === timeframe)?.label}
                </p>
              </div>
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Timeframe:</span>
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf.key}
                  onClick={() => setTimeframe(tf.key)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: timeframe === tf.key ? 'var(--border)' : 'transparent',
                    color: timeframe === tf.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Calendar */}
            <HabitCalendar
              habitKey={habitKey}
              calYear={calYear}
              calMonth={calMonth}
              dateMap={dateMap}
              onPrev={handlePrevMonth}
              onNext={handleNextMonth}
            />

            <p className="text-xs pb-4" style={{ color: 'var(--text-dim)' }}>
              Streak = consecutive days completed · Best = longest run ever
            </p>
          </>
        )}
      </div>
    </div>
  )
}
