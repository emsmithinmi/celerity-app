import { HABITS } from '../../lib/constants'

function HabitRow({ habit, checked, onToggle, percentage }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(!checked)}
        className="shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors"
        style={{
          borderColor: checked ? 'var(--habit-done-bg)' : 'var(--border)',
          backgroundColor: checked ? 'var(--habit-done-bg)' : 'transparent',
        }}
        aria-label={`Toggle ${habit.label}`}
      >
        {checked && <span className="text-xs text-black font-bold">✓</span>}
      </button>

      {/* Icon + Label */}
      <span className="text-lg shrink-0">{habit.icon}</span>
      <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{habit.label}</span>

      {/* 7-day mini bar */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="w-20 h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--border)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${percentage}%`,
              backgroundColor: percentage >= 70 ? 'var(--habit-done-bg)' : percentage >= 40 ? 'var(--state-warning-text)' : 'var(--danger)',
            }}
          />
        </div>
        <span className="text-xs w-8 text-right" style={{ color: 'var(--text-secondary)' }}>
          {percentage}%
        </span>
      </div>
    </div>
  )
}

export default function HabitsSection({ note, habitHistory = [], onToggle }) {
  if (!note) return null

  // Compute current-week percentage (Sun–Sat) for each habit from history
  const getPercentage = (habitKey) => {
    if (!habitHistory.length) return 0
    const completed = habitHistory.filter(day => day[habitKey]).length
    return Math.round((completed / 7) * 100)
  }

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
            checked={!!note[habit.key]}
            onToggle={(val) => onToggle(habit.key, val)}
            percentage={getPercentage(habit.key)}
          />
        ))}
      </div>
    </div>
  )
}
