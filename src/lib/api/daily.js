import { supabase } from '../supabase'

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getTodayNote() {
  const today = new Date().toISOString().split('T')[0]
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

export async function ensureTodayNote() {
  const today = new Date().toISOString().split('T')[0]
  const existing = await getNoteByDate(today)
  if (existing) return existing

  const { data, error } = await supabase
    .from('daily_notes')
    .insert({
      date: today,
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
    })
    .select()
    .single()
  if (error) throw error
  return data
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

export async function getHabitHistory(days = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('daily_notes')
    .select('date, habit_morning_meds, habit_evening_meds, habit_journal, habit_meditation, habit_breathwork, habit_stretching, habit_health_tracking')
    .gte('date', sinceStr)
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

// ─── Stats (for stat cards) ───────────────────────────────────────────────────

export async function getDailyStats() {
  const today = new Date().toISOString().split('T')[0]

  const [inProgress, nextActions, waiting, dueToday, stalled] = await Promise.all([
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'next_action'),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'next_action'),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('due_date', today),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'stalled'),
  ])

  return {
    inProgress: inProgress.count ?? 0,
    nextActions: nextActions.count ?? 0,
    waiting: waiting.count ?? 0,
    dueToday: dueToday.count ?? 0,
    stalled: stalled.count ?? 0,
  }
}
