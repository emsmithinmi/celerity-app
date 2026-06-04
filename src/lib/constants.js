// ─── Task Statuses ───────────────────────────────────────────────────────────
export const TASK_STATUSES = {
  inbox:       { label: 'Inbox',         icon: '📥', bg: '#FBBC05', text: '#000000', border: '#D4990A' },
  next_action: { label: 'Next Action',   icon: '⚡', bg: '#0F9D58', text: '#000000', border: '#0B7A42' },
  queued:      { label: 'Queued',        icon: '🗂',  bg: '#1967D2', text: '#ffffff', border: '#1256B0' },
  scheduled:   { label: 'Scheduled',     icon: '📅', bg: '#ADE8F4', text: '#000000', border: '#378ADD' },
  waiting:     { label: 'Waiting',       icon: '⏳', bg: '#DB4437', text: '#000000', border: '#B03228' },
  someday:     { label: 'Someday/Maybe', icon: '🔮', bg: '#ffffff', text: '#000000', border: '#BBBBBB' },
  done:        { label: 'Done',          icon: '✓',  bg: '#000000', text: '#ffffff', border: '#333333' },
}

// ─── Project Statuses ────────────────────────────────────────────────────────
export const PROJECT_STATUSES = {
  inbox:       { label: 'Inbox',          bg: '#FBBC05', text: '#000000', border: '#D4990A' },
  planning:    { label: 'Planning',       bg: '#ffffff', text: '#000000', border: '#BBBBBB' },
  in_progress: { label: 'In Progress',    bg: '#1967D2', text: '#ffffff', border: '#1256B0' },
  waiting:     { label: 'Waiting',        bg: '#DB4437', text: '#ffffff', border: '#B03228' },
  stalled:     { label: 'Stalled',        bg: '#FB9039', text: '#000000', border: '#c97030' },
  someday:     { label: 'Someday/Maybe',  bg: '#ffffff', text: '#000000', border: '#BBBBBB' },
  completed:   { label: 'Completed',      bg: '#000000', text: '#ffffff', border: '#333333' },
}

// ─── People Statuses ─────────────────────────────────────────────────────────
export const PEOPLE_STATUSES = {
  inbox:  { label: 'Inbox',  bg: '#FBBC05', text: '#000000' },
  active: { label: 'Active', bg: '#0F9D58', text: '#000000' },
  stale:  { label: 'Stale',  bg: '#6c7086', text: '#ffffff' },
}

// ─── Priorities ──────────────────────────────────────────────────────────────
export const PRIORITIES = {
  stat:    { label: 'STAT',    bg: '#DB4437', text: '#ffffff' },
  urgent:  { label: 'Urgent',  bg: '#E8710A', text: '#ffffff' },
  eod:     { label: 'EOD',     bg: '#FBBC05', text: '#000000' },
  routine: { label: 'Routine', bg: '#F1EFE8', text: '#5F5E5A' },
}

// ─── Energy Levels ───────────────────────────────────────────────────────────
export const ENERGY_LEVELS = [
  { value: 'physical',    label: 'Physical',    description: 'Requires physical effort or labor' },
  { value: 'deep_focus',  label: 'Deep Focus',  description: 'Mentally demanding computer work' },
  { value: 'admin',       label: 'Admin',       description: 'Light computer tasks' },
  { value: 'low_energy',  label: 'Low Energy',  description: 'Can do when tired or distracted' },
  { value: 'errand',      label: 'Errand',      description: 'Out-of-office or on-the-go task' },
]

// ─── Task Action Button Labels ────────────────────────────────────────────────
export const TASK_ACTIONS = {
  complete:          "All Done",
  did_it:            "Did It",
  waiting:           "There is a Holdup",
  next_action:       "Put Me in Coach",
  queue:             "Ready to Queue Up",
  schedule:          "Let's Get This on the Schedule",
  someday:           "This is for Another Day",
  convert_project:   "This Should Be Its Own Project",
  discard:           "Scrap This",
}

// ─── Project Action Button Labels ────────────────────────────────────────────
export const PROJECT_ACTIONS = {
  start_planning:    "Start Planning",
  start:             "Let's Get Started",
  complete:          "All Done",
  someday:           "Someday/Maybe",
  discard:           "Scrap This",
}

// ─── Habits ──────────────────────────────────────────────────────────────────
export const HABITS = [
  { key: 'habit_morning_meds',    label: 'Morning Meds',    icon: '💊' },
  { key: 'habit_evening_meds',    label: 'Evening Meds',    icon: '🌙' },
  { key: 'habit_journal',         label: 'Journal',         icon: '✍️'  },
  { key: 'habit_meditation',      label: 'Meditation',      icon: '🧘' },
  { key: 'habit_breathwork',      label: 'Breathwork',      icon: '🌬️' },
  { key: 'habit_stretching',      label: 'Stretching',      icon: '🤸' },
  { key: 'habit_health_tracking', label: 'Health Tracking', icon: '❤️' },
  { key: 'habit_code_challenge',  label: 'Code Challenge',  icon: '💻' },
]

// ─── Review Types ─────────────────────────────────────────────────────────────
export const REVIEW_TYPES = {
  daily:   { label: 'Daily Review',   description: 'Review today and set up tomorrow' },
  weekly:  { label: 'Weekly Review',  description: 'Reflect on the past week' },
  monthly: { label: 'Monthly Review', description: 'Monthly patterns and highlights' },
}

// ─── Challenge Topics ─────────────────────────────────────────────────────────
export const CHALLENGE_TOPICS = ['python', 'ai', 'llm', 'general']
export const CHALLENGE_DIFFICULTIES = ['beginner', 'intermediate', 'advanced']
