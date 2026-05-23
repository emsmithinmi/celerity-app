import { useState, useEffect, useMemo } from 'react'
import { getHabitHistory } from '../lib/api/daily'
import { HABITS } from '../lib/constants'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a map of date-string → row from history array */
function buildDateMap(history) {
  const map = {}
  for (const row of history) map[row.date] = row
  return map
}

/** All calendar day objects for a given year/month (with leading/trailing padding) */
function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  // Start grid on Monday
  const startDow = (firstDay.getDay() + 6) % 7  // Mon=0 … Sun=6
  const days = []

  // Leading empty cells
  for (let i = 0; i < startDow; i++) days.push(null)

  // Actual days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d)
    days.push(date.toISOString().split('T')[0])
  }

  // Trailing empty cells to complete last row
  while (days.length % 7 !== 0) days.push(null)

  return days
}

/** Count completed habits for a given daily_notes row */
function countCompleted(row) {
  if (!row) return null   // no record at all
  return HABITS.filter(h => row[h.key]).length
}

/** Compute current streak (consecutive days from today backwards) */
function computeCurrentStreak(dateMap, habitKey) {
  const today = new Date()
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const row = dateMap[dateStr]
    if (!row) break         // no record → streak ends
    if (!row[habitKey]) break  // not completed → streak ends
    streak++
  }
  return streak
}

/** Compute longest streak within history */
function computeLongestStreak(history, habitKey) {
  let longest = 0, current = 0
  // history is sorted ascending
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
  let prevDate = null
  for (const row of sorted) {
    if (!row[habitKey]) { current = 0; prevDate = null; continue }
    if (prevDate) {
      const prev = new Date(prevDate)
      const curr = new Date(row.date)
      const diff = (curr - prev) / (1000 * 60 * 60 * 24)
      if (diff === 1) {
        current++
      } else {
        current = 1
      }
    } else {
      current = 1
    }
    prevDate = row.date
    if (current > longest) longest = current
  }
  return longest
}

/** Compute completion % for last N days from today */
function computePercent(dateMap, habitKey, days) {
  const today = new Date()
  let completed = 0, total = 0
  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const row = dateMap[dateStr]
    if (row) {
      total++
      if (row[habitKey]) completed++
    }
  }
  return total === 0 ? 0 : Math.round((completed / total) * 100)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const TIMEFRAMES = [
  { key: 7,   label: '7 days'  },
  { key: 30,  label: '30 days' },
  { key: 90,  label: '90 days' },
  { key: 365, label: '1 year'  },
]

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function HabitCalendar({ calYear, calMonth, dateMap, onPrev, onNext }) {
  const grid = useMemo(() => buildCalendarGrid(calYear, calMonth), [calYear, calMonth])
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: '#181825', borderColor: '#313244' }}>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrev}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ color: '#6c7086', backgroundColor: 'transparent' }}
          onMouseEnter={e => e.target.style.color = '#cdd6f4'}
          onMouseLeave={e => e.target.style.color = '#6c7086'}
        >
          ← Prev
        </button>
        <h3 className="text-sm font-semibold" style={{ color: '#cdd6f4' }}>
          {MONTHS[calMonth]} {calYear}
        </h3>
        <button
          onClick={onNext}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ color: '#6c7086', backgroundColor: 'transparent' }}
          onMouseEnter={e => e.target.style.color = '#cdd6f4'}
          onMouseLeave={e => e.target.style.color = '#6c7086'}
        >
          Next →
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-2">
        {DOW_LABELS.map(d => (
          <div key={d} className="text-center text-xs font-medium py-1" style={{ color: '#6c7086' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1">
        {grid.map((dateStr, idx) => {
          if (!dateStr) return <div key={`empty-${idx}`} />

          const row       = dateMap[dateStr]
          const count     = countCompleted(row)
          const isToday   = dateStr === today
          const isFuture  = dateStr > today
          const dayNum    = parseInt(dateStr.split('-')[2], 10)

          let dotBg = 'transparent'
          let textColor = '#45475a'   // dim future/no-record days
          if (!isFuture && count !== null) {
            textColor = '#cdd6f4'
            if (count === 7)      dotBg = '#0F9D58'
            else if (count >= 4)  dotBg = '#FBBC05'
            else if (count >= 1)  dotBg = '#E8710A'
            else                  dotBg = '#313244'
          }

          return (
            <div
              key={dateStr}
              className="flex flex-col items-center justify-center rounded-lg py-1.5 gap-0.5"
              style={{
                backgroundColor: isToday ? '#1e3a5f' : 'transparent',
                outline: isToday ? '1px solid #89b4fa' : 'none',
                minHeight: '48px',
              }}
            >
              <span className="text-xs" style={{ color: isToday ? '#89b4fa' : textColor }}>
                {dayNum}
              </span>
              {!isFuture && count !== null && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{ backgroundColor: dotBg, color: count >= 4 ? '#000' : '#cdd6f4' }}
                >
                  {count}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: '#313244' }}>
        {[
          { color: '#0F9D58', label: 'All 7' },
          { color: '#FBBC05', label: '4–6' },
          { color: '#E8710A', label: '1–3' },
          { color: '#313244', label: '0' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs" style={{ color: '#6c7086' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HabitStatsRow({ habit, dateMap, history, timeframe }) {
  const currentStreak = computeCurrentStreak(dateMap, habit.key)
  const longestStreak = computeLongestStreak(history, habit.key)
  const percent       = computePercent(dateMap, habit.key, timeframe)

  const barColor = percent >= 70 ? '#0F9D58' : percent >= 40 ? '#FBBC05' : '#DB4437'

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0"
      style={{ borderColor: '#313244' }}
    >
      {/* Icon + label */}
      <span className="text-xl shrink-0">{habit.icon}</span>
      <div className="w-32 shrink-0">
        <p className="text-sm font-medium" style={{ color: '#cdd6f4' }}>{habit.label}</p>
      </div>

      {/* Streaks */}
      <div className="flex gap-4 text-xs shrink-0">
        <div className="text-center">
          <p className="font-semibold" style={{ color: '#89b4fa' }}>{currentStreak}</p>
          <p style={{ color: '#6c7086' }}>current</p>
        </div>
        <div className="text-center">
          <p className="font-semibold" style={{ color: '#cba6f7' }}>{longestStreak}</p>
          <p style={{ color: '#6c7086' }}>best</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#313244' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${percent}%`, backgroundColor: barColor }}
          />
        </div>
        <span className="text-xs w-9 text-right shrink-0" style={{ color: '#6c7086' }}>
          {percent}%
        </span>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Habits() {
  const today     = new Date()
  const [history,   setHistory]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [timeframe, setTimeframe] = useState(30)
  const [calYear,   setCalYear]   = useState(today.getFullYear())
  const [calMonth,  setCalMonth]  = useState(today.getMonth())

  useEffect(() => {
    setLoading(true)
    getHabitHistory(365)
      .then(setHistory)
      .finally(() => setLoading(false))
  }, [])

  const dateMap = useMemo(() => buildDateMap(history), [history])

  const handlePrevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  const handleNextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: '#313244' }}
      >
        <h1 className="text-xl font-semibold" style={{ color: '#cdd6f4' }}>Habits</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={{ color: '#6c7086' }}>Loading…</p>
          </div>
        ) : (
          <>
            {/* ── Calendar ── */}
            <HabitCalendar
              calYear={calYear}
              calMonth={calMonth}
              dateMap={dateMap}
              onPrev={handlePrevMonth}
              onNext={handleNextMonth}
            />

            {/* ── Stats ── */}
            <div>
              {/* Timeframe selector */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold" style={{ color: '#cdd6f4' }}>Completion Stats</h2>
                <div className="flex gap-1">
                  {TIMEFRAMES.map(tf => (
                    <button
                      key={tf.key}
                      onClick={() => setTimeframe(tf.key)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: timeframe === tf.key ? '#313244' : 'transparent',
                        color: timeframe === tf.key ? '#cdd6f4' : '#6c7086',
                      }}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column headers */}
              <div className="flex items-center gap-4 px-4 pb-1 text-xs" style={{ color: '#6c7086' }}>
                <span className="text-xl shrink-0 invisible">x</span>
                <span className="w-32 shrink-0">Habit</span>
                <div className="flex gap-4 shrink-0">
                  <span className="w-10 text-center">streak</span>
                  <span className="w-10 text-center">best</span>
                </div>
                <span className="flex-1 text-right pr-9">{TIMEFRAMES.find(t => t.key === timeframe)?.label}</span>
              </div>

              {/* Habit rows */}
              <div
                className="rounded-xl border overflow-hidden"
                style={{ backgroundColor: '#181825', borderColor: '#313244' }}
              >
                {HABITS.map(habit => (
                  <HabitStatsRow
                    key={habit.key}
                    habit={habit}
                    dateMap={dateMap}
                    history={history}
                    timeframe={timeframe}
                  />
                ))}
              </div>

              <p className="text-xs mt-2" style={{ color: '#45475a' }}>
                Streak = consecutive days completed · Best = longest run ever
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
