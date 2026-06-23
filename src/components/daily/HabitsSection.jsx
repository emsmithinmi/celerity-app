import { useMemo } from 'react'
import { Check } from 'lucide-react'

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

function HabitRow({ habit, weekDoneCount, todayDone, onToggleToday }) {
  const target = habit.target_days ?? 7
  const filled = Math.min(weekDoneCount, target)

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{habit.label}</span>

      <div className="flex items-center gap-1 shrink-0">
        {Array.from({ length: target }, (_, i) => {
          const isFilled = i < filled
          return (
            <button
              key={i}
              onClick={onToggleToday}
              title={todayDone ? 'Click to unmark today' : 'Click to mark today done'}
              className="flex items-center justify-center rounded transition-colors"
              style={{
                width: 18,
                height: 18,
                border: `1.5px solid ${isFilled ? 'transparent' : 'var(--border)'}`,
                backgroundColor: isFilled ? 'var(--habit-done-bg)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              {isFilled && <Check size={10} strokeWidth={3} style={{ color: '#000' }} />}
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
        {displayHabits.map(habit => {
          const weekDoneCount = weekDates.filter(d => !!dateMap[d]?.[habit.key]).length
          const todayDone = !!dateMap[today]?.[habit.key]
          return (
            <HabitRow
              key={habit.id}
              habit={habit}
              weekDoneCount={weekDoneCount}
              todayDone={todayDone}
              onToggleToday={() => onToggleDate(habit.key, today, !todayDone)}
            />
          )
        })}
      </div>
    </div>
  )
}
