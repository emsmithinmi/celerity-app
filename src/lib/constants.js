// ─── Task Statuses ────────────────────────────────────────────────────────────

export const TASK_STATUSES = {
  inbox: {
    value: 'inbox',
    label: 'Inbox',
    icon: '📥',
    bg: '#FBBC05',
    text: '#000000',
    border: '#D4990A',
  },
  next_action: {
    value: 'next_action',
    label: 'Next Action',
    icon: '⚡',
    bg: '#0F9D58',
    text: '#000000',
    border: '#0B7A42',
  },
  queued: {
    value: 'queued',
    label: 'Queued',
    icon: '🗂',
    bg: '#1967D2',
    text: '#FFFFFF',
    border: '#1256B0',
  },
  scheduled: {
    value: 'scheduled',
    label: 'Scheduled',
    icon: '📅',
    bg: '#ADE8F4',
    text: '#000000',
    border: '#378ADD',
  },
  waiting: {
    value: 'waiting',
    label: 'Waiting',
    icon: '⏳',
    bg: '#DB4437',
    text: '#000000',
    border: '#B03228',
  },
  someday: {
    value: 'someday',
    label: 'Someday / Maybe',
    icon: '🔮',
    bg: '#FFFFFF',
    text: '#000000',
    border: '#BBBBBB',
  },
  done: {
    value: 'done',
    label: 'Done',
    icon: '✓',
    bg: '#000000',
    text: '#FFFFFF',
    border: '#333333',
  },
}

export const TASK_STATUS_ORDER = [
  'inbox',
  'next_action',
  'queued',
  'scheduled',
  'waiting',
  'someday',
  'done',
]

// ─── Project Statuses ─────────────────────────────────────────────────────────

export const PROJECT_STATUSES = {
  inbox: {
    value: 'inbox',
    label: 'Inbox',
    bg: '#FBBC05',
    text: '#000000',
    border: null,
  },
  planning: {
    value: 'planning',
    label: 'Planning',
    bg: '#FFFFFF',
    text: '#000000',
    border: '#BBBBBB',
  },
  in_progress: {
    value: 'in_progress',
    label: 'In Progress',
    bg: '#1967D2',
    text: '#FFFFFF',
    border: '#1256B0',
  },
  waiting: {
    value: 'waiting',
    label: 'Waiting',
    bg: '#DB4437',
    text: '#FFFFFF',
    border: '#B03228',
  },
  completed: {
    value: 'completed',
    label: 'Completed',
    bg: '#000000',
    text: '#FFFFFF',
    border: '#333333',
  },
}

export const PROJECT_STATUS_ORDER = [
  'inbox',
  'planning',
  'in_progress',
  'waiting',
  'completed',
]

// ─── Priorities ───────────────────────────────────────────────────────────────

export const PRIORITIES = {
  stat: {
    value: 'stat',
    label: 'STAT',
    bg: '#DB4437',
    text: '#FFFFFF',
  },
  urgent: {
    value: 'urgent',
    label: 'Urgent',
    bg: '#E8710A',
    text: '#FFFFFF',
  },
  eod: {
    value: 'eod',
    label: 'EOD',
    bg: '#FBBC05',
    text: '#000000',
  },
  routine: {
    value: 'routine',
    label: 'Routine',
    bg: '#F1EFE8',
    text: '#5F5E5A',
  },
}

export const PRIORITY_ORDER = ['stat', 'urgent', 'eod', 'routine']

// ─── Button Labels ────────────────────────────────────────────────────────────

export const BUTTON_LABELS = {
  SET_IN_PROGRESS:      "Let's Get Started",
  SOMEDAY:              'This is for Another Day',
  NEXT_ACTION:          'Put Me in Coach',
  QUEUE:                'Ready to Queue Up',
  SCHEDULE:             "Let's Get This on the Schedule",
  WAITING:              'There is a Holdup',
  DONE:                 'All Done',
  DISCARD:              'Scrap This',
  CONVERT_TO_PROJECT:   'This Should Be Its Own Project',
}

// ─── Areas of Focus ───────────────────────────────────────────────────────────

export const AREAS = [
  'Work',
  'Personal',
  'Health',
  'Finance',
  'Learning',
  'Home',
  'Family',
  'Creative',
]

// ─── Contact Types ────────────────────────────────────────────────────────────

export const CONTACT_TYPES = ['Personal', 'Work', 'Services']

// ─── Habits ───────────────────────────────────────────────────────────────────

export const HABITS = [
  { key: 'habit_morning_meds',  label: 'Morning Meds' },
  { key: 'habit_evening_meds',  label: 'Evening Meds' },
  { key: 'habit_journal',       label: 'Journal' },
  { key: 'habit_meditation',    label: 'Meditation' },
  { key: 'habit_breathwork',    label: 'Breathwork' },
  { key: 'habit_stretching',    label: 'Stretching' },
]

// ─── UI Theme ─────────────────────────────────────────────────────────────────

export const THEME = {
  bg:          '#1e1e2e',
  pane:        '#181825',
  border:      '#313244',
  text:        '#cdd6f4',
  muted:       '#6c7086',
  link:        '#89b4fa',
  highlight:   '#673ab7',
  contextTag:  { bg: '#FFFFFF', text: '#1967D2' },
}
