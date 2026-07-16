import { useMemo } from 'react'
import { Check } from 'lucide-react'

const DOW_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DOW_NAMES   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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

function HabitRow({ habit, weekDates, dateMap, today, onToggleDate }) {
  const weekdays = habit.target_weekdays ?? [0, 1, 2, 3, 4, 5, 6]

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{habit.label}</span>

      <div className="flex items-center gap-1 shrink-0">
        {weekDates.map((dateStr, i) => {
          const isTarget = weekdays.includes(i)
          const isDone   = !!dateMap[dateStr]?.[habit.key]
          const isFuture = dateStr > today
          const clickable = isTarget && !isFuture
          return (
            <button
              key={i}
              onClick={clickable ? () => onToggleDate(habit.key, dateStr, !isDone) : undefined}
              disabled={!clickable}
              title={!isTarget ? `${DOW_NAMES[i]} — not scheduled` : isDone ? `${DOW_NAMES[i]} — click to unmark` : `${DOW_NAMES[i]} — click to mark done`}
              className="flex items-center justify-center rounded transition-colors"
              style={{
                width: 18,
                height: 18,
                border: `1.5px solid ${!isTarget ? 'transparent' : isDone ? 'transparent' : 'var(--border)'}`,
                backgroundColor: !isTarget ? 'transparent' : isDone ? 'var(--habit-done-bg)' : 'transparent',
                opacity: isTarget ? 1 : 0.35,
                cursor: clickable ? 'pointer' : 'default',
              }}
            >
              {isDone && isTarget
                ? <Check size={10} strokeWidth={3} style={{ color: '#000' }} />
                : <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{DOW_LETTERS[i]}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function HabitsSection({ habits = [], habitHistory = [], onToggleDate }) {
  const today     = new Date().toLocaleDateString('en-CA')
  const weekDates = useMemo(currentWeekDates, [])
  const dateMap   = useMemo(
    () => Object.fromEntries(habitHistory.map(r => [r.date, r.entries ?? {}])),
    [habitHistory]
  )

  const displayHabits = habits.filter(h => h.key !== 'habit_code_challenge')
  const completedToday = displayHabits.filter(h => !!dateMap[today]?.[h.key]).length

  if (!displayHabits.length) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Habits</h3>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {completedToday} of {displayHabits.length} done today
        </span>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
        {displayHabits.map(habit => (
          <HabitRow
            key={habit.id}
            habit={habit}
            weekDates={weekDates}
            dateMap={dateMap}
            today={today}
            onToggleDate={onToggleDate}
          />
        ))}
      </div>
    </div>
  )
}
