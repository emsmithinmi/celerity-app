import { supabase } from '../supabase'

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getTodayNote() {
  const today = new Date().toLocaleDateString('en-CA')
  return getNoteByDate(today)
}

export async function getNoteByDate(date) {
  const { data, error } = await supabase
    .from('daily_notes')
    .select('*')
    .eq('date', date)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getRecentNotes(limit = 30) {
  const { data, error } = await supabase
    .from('daily_notes')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// ─── Create / Ensure Today ────────────────────────────────────────────────────

export async function ensureNoteForDate(date) {
  const existing = await getNoteByDate(date)
  if (existing) return existing

  const { data, error } = await supabase
    .from('daily_notes')
    .insert({
      date,
      top_of_mind: [],
      agenda: [],
      notes: [],
      habit_morning_meds: false,
      habit_evening_meds: false,
      habit_journal: false,
      habit_meditation: false,
      habit_breathwork: false,
      habit_stretching: false,
      habit_health_tracking: false,
      habit_code_challenge: false,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// Convenience wrapper kept for any callers outside the Daily page
export async function ensureTodayNote() {
  return ensureNoteForDate(new Date().toLocaleDateString('en-CA'))
}

// ─── Habits ───────────────────────────────────────────────────────────────────

export async function toggleHabit(noteId, habitKey, value) {
  const { data, error } = await supabase
    .from('daily_notes')
    .update({ [habitKey]: value, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .select()
    .single()
  if (error) throw error
  return data
}

// Set a habit on an arbitrary date — ensures the day's note exists first so a
// missed day can be back-filled. Returns the updated note row.
export async function setHabitForDate(date, habitKey, value) {
  const note = await ensureNoteForDate(date)
  return toggleHabit(note.id, habitKey, value)
}

export async function getHabitHistory(since) {
  const { data, error } = await supabase
    .from('daily_notes')
    .select('date, habit_morning_meds, habit_evening_meds, habit_journal, habit_meditation, habit_breathwork, habit_stretching, habit_health_tracking, habit_code_challenge')
    .gte('date', since)
    .order('date', { ascending: true })
  if (error) throw error
  return data
}

// ─── Top of Mind ─────────────────────────────────────────────────────────────

export async function updateTopOfMind(noteId, items) {
  const { data, error } = await supabase
    .from('daily_notes')
    .update({ top_of_mind: items, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Notes (timestamped entries) ──────────────────────────────────────────────

export async function addNoteEntry(noteId, body) {
  const { data: note } = await supabase
    .from('daily_notes')
    .select('notes')
    .eq('id', noteId)
    .single()

  const existing = note?.notes ?? []
  const updated = [...existing, {
    timestamp: new Date().toISOString(),
    body,
  }]

  const { data, error } = await supabase
    .from('daily_notes')
    .update({ notes: updated, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateNotesArray(noteId, notes) {
  const { data, error } = await supabase
    .from('daily_notes')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Agenda ───────────────────────────────────────────────────────────────────

export async function updateAgenda(noteId, agendaItems) {
  const { data, error } = await supabase
    .from('daily_notes')
    .update({ agenda: agendaItems, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Quote ────────────────────────────────────────────────────────────────────

// Quotes shown in the last `days` days (default 30) — used to keep rerolls fresh.
export async function getRecentQuoteTexts(days = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toLocaleDateString('en-CA')
  const { data, error } = await supabase
    .from('daily_notes')
    .select('quote')
    .gte('date', sinceStr)
    .not('quote', 'is', null)
  if (error) throw error
  return (data ?? []).map(r => r.quote).filter(Boolean)
}

// Quotes the user has permanently blocked — stored on the user record so it
// syncs across devices and isn't tied to any single daily_note.
export async function getBlockedQuoteTexts() {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.user_metadata?.blocked_quotes ?? []
}

export async function blockQuoteText(text) {
  const { data: { user } } = await supabase.auth.getUser()
  const current = user?.user_metadata?.blocked_quotes ?? []
  if (current.includes(text)) return current
  const next = [...current, text]
  const { error } = await supabase.auth.updateUser({ data: { blocked_quotes: next } })
  if (error) throw error
  return next
}

export async function updateQuote(noteId, text, author) {
  const { data, error } = await supabase
    .from('daily_notes')
    .update({ quote: text, quote_author: author, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Daily Brief ─────────────────────────────────────────────────────────────

export async function updateDailyBrief(noteId, brief) {
  const { data, error } = await supabase
    .from('daily_notes')
    .update({ daily_brief: brief, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Challenge ────────────────────────────────────────────────────────────────

export async function updateChallenge(noteId, challengeData) {
  const { data, error } = await supabase
    .from('daily_notes')
    .update({ code_challenge: challengeData, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Calendar Events ──────────────────────────────────────────────────────────

export async function getCalendarEvents(date) {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('date', date)
    .order('all_day', { ascending: false }) // all-day first
    .order('start_time', { ascending: true })
  if (error) throw error
  return data ?? []
}

// ─── Stats (for stat cards) ───────────────────────────────────────────────────

export async function getDailyStats(date) {
  const d = date ?? new Date().toLocaleDateString('en-CA')

  const [
    activeProjects, activeTasks,
    inProgress, nextActions, waiting, stalled,
    dueTodayTasks,
    inboxTasks, inboxProjects,
  ] = await Promise.all([
    // All projects with active intent (planning, in_progress, waiting, stalled)
    supabase.from('projects').select('id', { count: 'exact', head: true })
      .in('status', ['planning', 'in_progress', 'waiting', 'stalled'])
      .is('archived_at', null),

    // All active tasks (next_action, queued, waiting, scheduled)
    supabase.from('tasks').select('id', { count: 'exact', head: true })
      .in('status', ['next_action', 'queued', 'waiting', 'scheduled'])
      .is('archived_at', null),

    // Projects in progress only
    supabase.from('projects').select('id', { count: 'exact', head: true })
      .eq('status', 'in_progress').is('archived_at', null),

    // Next action tasks only
    supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('status', 'next_action').is('archived_at', null),

    // Waiting tasks
    supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('status', 'waiting').is('archived_at', null),

    // Stalled projects
    supabase.from('projects').select('id', { count: 'exact', head: true })
      .eq('status', 'stalled').is('archived_at', null),

    // Due today: due_date = today OR status = scheduled
    supabase.from('tasks').select('id', { count: 'exact', head: true })
      .or(`due_date.eq.${d},status.eq.scheduled`)
      .not('status', 'in', '("done","archived")')
      .is('archived_at', null),

    // Inbox counts (tasks + projects only — people have no status lifecycle)
    supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('status', 'inbox').is('archived_at', null),
    supabase.from('projects').select('id', { count: 'exact', head: true })
      .eq('status', 'inbox').is('archived_at', null),
  ])

  return {
    inbox:          (inboxTasks.count ?? 0) + (inboxProjects.count ?? 0),
    activeProjects: activeProjects.count ?? 0,
    activeTasks:    activeTasks.count    ?? 0,
    inProgress:     inProgress.count     ?? 0,
    nextActions:    nextActions.count    ?? 0,
    waiting:        waiting.count        ?? 0,
    stalled:        stalled.count        ?? 0,
    dueToday:       dueTodayTasks.count  ?? 0,
  }
}
