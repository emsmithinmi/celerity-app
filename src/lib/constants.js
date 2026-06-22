// Status pill colors are CSS variables defined in src/index.css so they shift
// with the active theme (Catppuccin / GitHub Dark). Don't hardcode hex here.
// `icon` values are Lucide icon names (rendered via the LucideIcon component).

// ─── Task Statuses ───────────────────────────────────────────────────────────
export const TASK_STATUSES = {
  inbox:       { label: 'Inbox',         icon: 'Inbox',     bg: 'var(--status-task-inbox-bg)',     text: 'var(--status-task-inbox-text)',     border: 'var(--status-task-inbox-border)'     },
  next_action: { label: 'Next Action',   icon: 'Zap',       bg: 'var(--status-task-next-bg)',      text: 'var(--status-task-next-text)',      border: 'var(--status-task-next-border)'      },
  queued:      { label: 'Queued',        icon: 'Layers',    bg: 'var(--status-task-queued-bg)',    text: 'var(--status-task-queued-text)',    border: 'var(--status-task-queued-border)'    },
  scheduled:   { label: 'Scheduled',     icon: 'Calendar',  bg: 'var(--status-task-scheduled-bg)', text: 'var(--status-task-scheduled-text)', border: 'var(--status-task-scheduled-border)' },
  waiting:     { label: 'Waiting',       icon: 'Hourglass', bg: 'var(--status-task-waiting-bg)',   text: 'var(--status-task-waiting-text)',   border: 'var(--status-task-waiting-border)'   },
  someday:     { label: 'Someday/Maybe', icon: 'Sparkles',  bg: 'var(--status-task-someday-bg)',   text: 'var(--status-task-someday-text)',   border: 'var(--status-task-someday-border)'   },
  done:        { label: 'Done',          icon: 'Check',     bg: 'var(--status-task-done-bg)',      text: 'var(--status-task-done-text)',      border: 'var(--status-task-done-border)'      },
}

// ─── Project Statuses ────────────────────────────────────────────────────────
export const PROJECT_STATUSES = {
  inbox:       { label: 'Inbox',          bg: 'var(--status-project-inbox-bg)',      text: 'var(--status-project-inbox-text)',      border: 'var(--status-project-inbox-border)'      },
  planning:    { label: 'Planning',       bg: 'var(--status-project-planning-bg)',   text: 'var(--status-project-planning-text)',   border: 'var(--status-project-planning-border)'   },
  in_progress: { label: 'In Progress',    bg: 'var(--status-project-inprogress-bg)', text: 'var(--status-project-inprogress-text)', border: 'var(--status-project-inprogress-border)' },
  waiting:     { label: 'Waiting',        bg: 'var(--status-project-waiting-bg)',    text: 'var(--status-project-waiting-text)',    border: 'var(--status-project-waiting-border)'    },
  stalled:     { label: 'Stalled',        bg: 'var(--status-project-stalled-bg)',    text: 'var(--status-project-stalled-text)',    border: 'var(--status-project-stalled-border)'    },
  someday:     { label: 'Someday/Maybe',  bg: 'var(--status-project-someday-bg)',    text: 'var(--status-project-someday-text)',    border: 'var(--status-project-someday-border)'    },
  completed:   { label: 'Completed',      bg: 'var(--status-project-completed-bg)',  text: 'var(--status-project-completed-text)',  border: 'var(--status-project-completed-border)'  },
}

// ─── People Statuses ─────────────────────────────────────────────────────────
export const PEOPLE_STATUSES = {
  inbox:  { label: 'Inbox',  bg: 'var(--status-person-inbox-bg)',  text: 'var(--status-person-inbox-text)'  },
  active: { label: 'Active', bg: 'var(--status-person-active-bg)', text: 'var(--status-person-active-text)' },
  stale:  { label: 'Stale',  bg: 'var(--status-person-stale-bg)',  text: 'var(--status-person-stale-text)'  },
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
// `icon` is a Lucide icon name; render via the LucideIcon component.
export const HABITS = [
  { key: 'habit_morning_meds',    label: 'Morning Meds',      icon: 'Pill'              },
  { key: 'habit_evening_meds',    label: "Last Night's Meds", icon: 'Moon'              },
  { key: 'habit_journal',         label: 'Journal',           icon: 'PenLine'           },
  { key: 'habit_meditation',      label: 'Meditation',        icon: 'Brain'             },
  { key: 'habit_breathwork',      label: 'Breathwork',        icon: 'Wind'              },
  { key: 'habit_stretching',      label: 'Stretching',        icon: 'StretchHorizontal' },
  { key: 'habit_health_tracking', label: 'Health Tracking',   icon: 'Heart'             },
  { key: 'habit_code_challenge',  label: 'Code Challenge',    icon: 'Code'              },
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
