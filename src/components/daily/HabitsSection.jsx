import { useMemo } from 'react'
import { HABITS } from '../../lib/constants'

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] // Sunday → Saturday

// The 7 dates of the current week, Sunday → Saturday.
function currentWeekDates() {
  const now = new Date()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - now.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return d.toLocaleDateString('en-CA')
  })
}

function WeekChecks({ weekDates, today, doneFor, onToggleDate }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {weekDates.map((date, i) => {
        const isFuture = date > today
        const isToday  = date === today
        const done     = doneFor(date)
        return (
          <button
            key={date}
            disabled={isFuture}
            onClick={() => !isFuture && onToggleDate(date, !done)}
            title={`${date}${isToday ? ' (today)' : ''}`}
            className="flex flex-col items-center gap-0.5"
            style={{ cursor: isFuture ? 'default' : 'pointer' }}
          >
            <span className="text-[10px] leading-none" style={{ color: isToday ? 'var(--accent)' : 'var(--text-dim)' }}>
              {DOW_LABELS[i]}
            </span>
            <span
              className="flex items-center justify-center rounded transition-colors"
              style={{
                width: 18,
                height: 18,
                border: `1.5px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`,
                backgroundColor: done ? 'var(--habit-done-bg)' : 'transparent',
                opacity: isFuture ? 0.35 : 1,
              }}
            >
              {done && <span className="text-[10px] text-black font-bold leading-none">✓</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function HabitRow({ habit, weekDates, today, dateMap, noteToday, onToggleDate }) {
  const doneFor = (date) =>
    date === today ? !!noteToday : !!(dateMap[date] && dateMap[date][habit.key])

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      {/* Icon + Label */}
      <span className="text-lg shrink-0">{habit.icon}</span>
      <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{habit.label}</span>

      {/* Week (Sun–Sat) check-offs */}
      <WeekChecks
        weekDates={weekDates}
        today={today}
        doneFor={doneFor}
        onToggleDate={(date, val) => onToggleDate(habit.key, date, val)}
      />
    </div>
  )
}

export default function HabitsSection({ note, habitHistory = [], onToggleDate }) {
  const today     = new Date().toLocaleDateString('en-CA')
  const weekDates = useMemo(currentWeekDates, [])
  const dateMap   = useMemo(
    () => Object.fromEntries(habitHistory.map(r => [r.date, r])),
    [habitHistory]
  )

  if (!note) return null

  const displayHabits  = HABITS.filter(h => h.key !== 'habit_code_challenge')
  const completedToday = displayHabits.filter(h => note[h.key]).length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Habits</h3>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {completedToday} of {displayHabits.length} completed today
        </span>
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
      >
        {displayHabits.map(habit => (
          <HabitRow
            key={habit.key}
            habit={habit}
            weekDates={weekDates}
            today={today}
            dateMap={dateMap}
            noteToday={note[habit.key]}
            onToggleDate={onToggleDate}
          />
        ))}
      </div>
    </div>
  )
}
