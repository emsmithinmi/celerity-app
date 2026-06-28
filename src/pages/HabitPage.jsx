import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getHabits, getHabitHistory, setHabitEntry } from '../lib/api/habits'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDateMap(history) {
  const map = {}
  for (const row of history) map[row.date] = row.entries ?? {}
  return map
}

function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay() // Sun=0…Sat=6
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
    if (!dateMap[dateStr]?.[habitKey]) break
    streak++
  }
  return streak
}

function computeLongestStreak(history, habitKey) {
  let longest = 0, current = 0
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
  let prevDate = null
  for (const row of sorted) {
    if (!row.entries?.[habitKey]) { current = 0; prevDate = null; continue }
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
    const entries = dateMap[start]
    return entries !== undefined ? (entries[habitKey] ? 100 : 0) : null
  }
  let completed = 0, total = 0
  let d = new Date(start + 'T12:00:00')
  const endDate = new Date(end + 'T12:00:00')
  while (d <= endDate) {
    const dateStr = d.toLocaleDateString('en-CA')
    const entries = dateMap[dateStr]
    if (entries !== undefined) { total++; if (entries[habitKey]) completed++ }
    d.setDate(d.getDate() + 1)
  }
  return total === 0 ? 0 : Math.round((completed / total) * 100)
}

// ─── Components ───────────────────────────────────────────────────────────────

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const TIMEFRAMES = [
  { key: 'today', label: 'Today'      },
  { key: 'week',  label: 'This Week'  },
  { key: 'month', label: 'This Month' },
  { key: 'year',  label: 'This Year'  },
]

function buildWeekDates() {
  const today = new Date()
  const dow = today.getDay()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - dow + i)
    return d.toLocaleDateString('en-CA')
  })
}

function CalendarCell({ dateStr, habitKey, dateMap, today, timeframe, onToggle }) {
  const done     = !!dateMap[dateStr]?.[habitKey]
  const isToday  = dateStr === today
  const isFuture = dateStr > today
  const isOutOfScope = timeframe === 'today' && !isToday
  const dayNum   = parseInt(dateStr.split('-')[2], 10)
  const disabled = isFuture || isOutOfScope

  return (
    <button
      disabled={disabled}
      onClick={() => !disabled && onToggle(dateStr, !done)}
      title={disabled ? '' : done ? 'Done — click to clear' : 'Click to mark done'}
      className="flex flex-col items-center justify-center rounded-lg py-1.5 gap-0.5 transition-colors"
      style={{
        backgroundColor: isToday ? 'var(--card-task-bg)' : 'transparent',
        outline: isToday ? '1px solid var(--accent)' : 'none',
        minHeight: '48px',
        cursor: disabled ? 'default' : 'pointer',
        opacity: isOutOfScope ? 0.3 : 1,
      }}
    >
      <span className="text-xs" style={{ color: isToday ? 'var(--accent)' : (isFuture || isOutOfScope) ? 'var(--text-dim)' : 'var(--text-primary)' }}>
        {dayNum}
      </span>
      {!isFuture && (
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: done ? 'var(--habit-done-bg)' : isOutOfScope ? 'transparent' : 'var(--border)' }}
        />
      )}
    </button>
  )
}

function HabitCalendar({ habitKey, calYear, calMonth, dateMap, timeframe, onPrev, onNext, onToggle }) {
  const grid    = useMemo(() => buildCalendarGrid(calYear, calMonth), [calYear, calMonth])
  const weekDates = useMemo(() => buildWeekDates(), [])
  const today   = new Date().toLocaleDateString('en-CA')
  const isYearView = timeframe === 'year'

  const legend = (
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
  )

  // Today view — single day card
  if (timeframe === 'today') {
    const done = !!dateMap[today]?.[habitKey]
    const dowLabel = DOW_LABELS[new Date(today + 'T12:00:00').getDay()]
    const [, , dd] = today.split('-')
    const monthIdx = parseInt(today.split('-')[1], 10) - 1
    return (
      <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-semibold text-center mb-4" style={{ color: 'var(--text-primary)' }}>
          {MONTHS[monthIdx]} {today.slice(0, 4)}
        </h3>
        <div className="flex justify-center">
          <button
            onClick={() => onToggle(today, !done)}
            className="flex flex-col items-center justify-center rounded-xl gap-2 transition-colors"
            style={{
              backgroundColor: 'var(--card-task-bg)',
              outline: '1px solid var(--accent)',
              width: '120px',
              height: '120px',
              cursor: 'pointer',
            }}
          >
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{dowLabel}</span>
            <span className="text-4xl font-bold" style={{ color: 'var(--accent)' }}>{parseInt(dd, 10)}</span>
            <div
              className="w-5 h-5 rounded-full"
              style={{ backgroundColor: done ? 'var(--habit-done-bg)' : 'var(--border)' }}
            />
          </button>
        </div>
        {legend}
      </div>
    )
  }

  // Week view
  if (timeframe === 'week') {
    const rangeStart = weekDates[0]
    const rangeEnd   = weekDates[6]
    const monthLabel = rangeStart.slice(0, 7) === rangeEnd.slice(0, 7)
      ? `${MONTHS[parseInt(rangeStart.slice(5, 7), 10) - 1]} ${rangeStart.slice(0, 4)}`
      : `${MONTHS[parseInt(rangeStart.slice(5, 7), 10) - 1]} – ${MONTHS[parseInt(rangeEnd.slice(5, 7), 10) - 1]} ${rangeEnd.slice(0, 4)}`

    return (
      <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-semibold text-center mb-4" style={{ color: 'var(--text-primary)' }}>
          {monthLabel}
        </h3>
        <div className="grid grid-cols-7 mb-2">
          {DOW_LABELS.map(d => (
            <div key={d} className="text-center text-xs font-medium py-1" style={{ color: 'var(--text-secondary)' }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekDates.map(dateStr => (
            <CalendarCell key={dateStr} dateStr={dateStr} habitKey={habitKey} dateMap={dateMap} today={today} timeframe={timeframe} onToggle={onToggle} />
          ))}
        </div>
        {legend}
      </div>
    )
  }

  // Year view — horizontally scrollable strip of all 12 months
  if (timeframe === 'year') {
    const year = calYear
    return (
      <div className="rounded-xl border" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-sm font-semibold text-center" style={{ color: 'var(--text-primary)' }}>{year}</h3>
        </div>
        <div className="overflow-x-auto pb-4 px-4">
          <div className="flex gap-6" style={{ minWidth: 'max-content' }}>
            {Array.from({ length: 12 }, (_, m) => {
              const monthGrid = buildCalendarGrid(year, m)
              return (
                <div key={m} style={{ width: '220px', flexShrink: 0 }}>
                  <p className="text-xs font-semibold text-center mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {MONTHS[m]}
                  </p>
                  <div className="grid grid-cols-7 mb-1">
                    {DOW_LABELS.map(d => (
                      <div key={d} className="text-center py-0.5" style={{ color: 'var(--text-dim)', fontSize: '10px' }}>{d[0]}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {monthGrid.map((dateStr, idx) => {
                      if (!dateStr) return <div key={`e-${idx}`} />
                      const done     = !!dateMap[dateStr]?.[habitKey]
                      const isToday  = dateStr === today
                      const isFuture = dateStr > today
                      const dayNum   = parseInt(dateStr.split('-')[2], 10)
                      return (
                        <button
                          key={dateStr}
                          disabled={isFuture}
                          onClick={() => !isFuture && onToggle(dateStr, !done)}
                          title={isFuture ? '' : done ? 'Done — click to clear' : 'Click to mark done'}
                          className="flex flex-col items-center justify-center rounded gap-0.5 transition-colors"
                          style={{
                            backgroundColor: isToday ? 'var(--card-task-bg)' : 'transparent',
                            outline: isToday ? '1px solid var(--accent)' : 'none',
                            minHeight: '36px',
                            cursor: isFuture ? 'default' : 'pointer',
                          }}
                        >
                          <span style={{ fontSize: '10px', color: isToday ? 'var(--accent)' : isFuture ? 'var(--text-dim)' : 'var(--text-primary)' }}>
                            {dayNum}
                          </span>
                          {!isFuture && (
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: done ? 'var(--habit-done-bg)' : 'var(--border)' }} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {legend && <div className="px-4 pb-4">{legend}</div>}
      </div>
    )
  }

  // Month view — full grid locked to current month, no nav
  const monthLabel = `${MONTHS[calMonth]} ${calYear}`
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
      <h3 className="text-sm font-semibold text-center mb-4" style={{ color: 'var(--text-primary)' }}>{monthLabel}</h3>
      <div className="grid grid-cols-7 mb-2">
        {DOW_LABELS.map(d => (
          <div key={d} className="text-center text-xs font-medium py-1" style={{ color: 'var(--text-secondary)' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((dateStr, idx) => {
          if (!dateStr) return <div key={`empty-${idx}`} />
          return <CalendarCell key={dateStr} dateStr={dateStr} habitKey={habitKey} dateMap={dateMap} today={today} timeframe={timeframe} onToggle={onToggle} />
        })}
      </div>
      {legend}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HabitPage() {
  const { habit: habitKey } = useParams()
  const navigate = useNavigate()

  const today = new Date()
  const [habit,     setHabit]     = useState(null)
  const [history,   setHistory]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [timeframe, setTimeframe] = useState('week')
  const [calYear,   setCalYear]   = useState(today.getFullYear())
  const [calMonth,  setCalMonth]  = useState(today.getMonth())

  useEffect(() => {
    setLoading(true)
    const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1)
    Promise.all([
      getHabits(),
      getHabitHistory(yearAgo.toLocaleDateString('en-CA')),
    ]).then(([habits, hist]) => {
      setHabit(habits.find(h => h.key === habitKey) ?? null)
      setHistory(hist)
    }).finally(() => setLoading(false))
  }, [habitKey])

  const dateMap = useMemo(() => buildDateMap(history), [history])

  const currentStreak = useMemo(() => computeCurrentStreak(dateMap, habitKey), [dateMap, habitKey])
  const longestStreak = useMemo(() => computeLongestStreak(history, habitKey), [history, habitKey])
  const percent       = useMemo(() => computePercent(dateMap, habitKey, timeframe), [dateMap, habitKey, timeframe])

  const barColor = percent === null ? 'var(--text-dim)' : percent >= 70 ? 'var(--habit-done-bg)' : percent >= 40 ? 'var(--state-warning-text)' : 'var(--danger)'

  const handleToggleDay = async (dateStr, value) => {
    setHistory(prev => {
      const exists = prev.some(r => r.date === dateStr)
      return exists
        ? prev.map(r => r.date === dateStr ? { ...r, entries: { ...r.entries, [habitKey]: value } } : r)
        : [...prev, { date: dateStr, entries: { [habitKey]: value } }]
    })
    try {
      await setHabitEntry(dateStr, habitKey, value)
    } catch {
      const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1)
      getHabitHistory(yearAgo.toLocaleDateString('en-CA')).then(setHistory)
    }
  }

  const handlePrevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  const handleNextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
    </div>
  )

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
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{habit.label}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
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
                  {percent === null ? '—' : timeframe === 'today' ? (percent === 100 ? 'Done' : '—') : `${percent}%`}
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
                  onClick={() => {
                    setTimeframe(tf.key)
                    if (tf.key !== 'year') { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()) }
                  }}
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
              timeframe={timeframe}
              onPrev={handlePrevMonth}
              onNext={handleNextMonth}
              onToggle={handleToggleDay}
            />

            <p className="text-xs pb-4" style={{ color: 'var(--text-dim)' }}>
              Click any day to check or uncheck it · Streak = consecutive days completed · Best = longest run ever
            </p>
          </>
      </div>
    </div>
  )
}
