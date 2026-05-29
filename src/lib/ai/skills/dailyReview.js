import { supabase } from '../../supabase'
import { callAI } from '../client'
import { ensureNoteForDate, updateTopOfMind, updateAgenda, updateChallenge } from '../../api/daily'
import { updateSuggestions } from '../../api/reviews'

// ─── Context Builder ──────────────────────────────────────────────────────────

async function buildContext(reviewContent = {}) {
  const today = new Date().toISOString().split('T')[0]

  const [projectsRes, activeTasksRes, inboxRes, notesRes, todayNoteRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, status, area, priority, start_date, end_date, description')
      .is('archived_at', null)
      .not('status', 'eq', 'completed')
      .order('updated_at', { ascending: false }),

    supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, area, project_id, projects(title)')
      .in('status', ['next_action', 'waiting', 'scheduled', 'queued'])
      .is('archived_at', null)
      .order('updated_at', { ascending: false }),

    supabase
      .from('tasks')
      .select('id, title')
      .eq('status', 'inbox')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(20),

    // Last 30 days of daily notes — this is the "memory"
    supabase
      .from('daily_notes')
      .select('date, notes, top_of_mind')
      .order('date', { ascending: false })
      .limit(30),

    supabase.from('daily_notes').select('*').eq('date', today).maybeSingle(),
  ])

  const projects    = projectsRes.data    ?? []
  const activeTasks = activeTasksRes.data ?? []
  const inboxTasks  = inboxRes.data       ?? []
  const recentNotes = notesRes.data       ?? []
  const todayNote   = todayNoteRes.data

  const activeProjectIds = new Set(activeTasks.filter(t => t.project_id).map(t => t.project_id))
  const stalledRisk = projects
    .filter(p => p.status === 'in_progress' && !activeProjectIds.has(p.id))
    .map(p => p.title)

  const habits = todayNote ? {
    morning_meds:    todayNote.habit_morning_meds,
    evening_meds:    todayNote.habit_evening_meds,
    journal:         todayNote.habit_journal,
    meditation:      todayNote.habit_meditation,
    breathwork:      todayNote.habit_breathwork,
    stretching:      todayNote.habit_stretching,
    health_tracking: todayNote.habit_health_tracking,
  } : {}

  return { today, projects, activeTasks, inboxTasks, inboxCount: inboxTasks.length, recentNotes, stalledRisk, habits, reviewContent }
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a personal productivity assistant for a GTD system called Celerity.
Your job is to help the user close out their day and set up for tomorrow.

You have access to their projects, tasks, and the last 30 days of daily notes (their "memory").
Use this memory to make personalized, specific recommendations — reference actual project names and patterns you notice.

Be direct and insightful, not generic. Tone: warm, focused, like a trusted advisor who knows their work deeply.

You must respond with valid JSON only — no markdown, no preamble, no explanation outside the JSON.`

// ─── User Prompt Builder ──────────────────────────────────────────────────────

function buildPrompt(ctx) {
  const { today, projects, activeTasks, inboxCount, inboxTasks, recentNotes, stalledRisk, habits, reviewContent } = ctx
  const lines = []

  lines.push(`TODAY: ${today}`)
  lines.push('')

  lines.push('ACTIVE PROJECTS:')
  if (projects.length === 0) {
    lines.push('None.')
  } else {
    for (const p of projects) {
      const due = p.end_date ? ` [due ${p.end_date}]` : ''
      lines.push(`- [${p.status}] ${p.title}${due}${p.area ? ` (${p.area})` : ''}`)
      if (p.description) lines.push(`  ${p.description.slice(0, 100)}`)
    }
  }
  lines.push('')

  lines.push('ACTIVE TASKS:')
  if (activeTasks.length === 0) {
    lines.push('None.')
  } else {
    for (const t of activeTasks) {
      const due = t.due_date ? ` [due ${t.due_date}]` : ''
      const proj = t.projects?.title ? ` → ${t.projects.title}` : ''
      lines.push(`- [${t.status}] ${t.title}${due}${proj}`)
    }
  }
  lines.push('')

  if (inboxCount > 0) {
    lines.push(`INBOX (${inboxCount} unprocessed):`)
    inboxTasks.slice(0, 5).forEach(t => lines.push(`- ${t.title}`))
    if (inboxCount > 5) lines.push(`...and ${inboxCount - 5} more`)
    lines.push('')
  }

  if (stalledRisk.length > 0) {
    lines.push('⚠ PROJECTS WITH NO ACTIVE TASKS (stalled risk):')
    stalledRisk.forEach(t => lines.push(`- ${t}`))
    lines.push('')
  }

  const completed = Object.entries(habits).filter(([, v]) => v).map(([k]) => k.replace(/_/g, ' '))
  const missed    = Object.entries(habits).filter(([, v]) => !v).map(([k]) => k.replace(/_/g, ' '))
  if (completed.length || missed.length) {
    lines.push("TODAY'S HABITS:")
    if (completed.length) lines.push(`Completed: ${completed.join(', ')}`)
    if (missed.length)    lines.push(`Missed: ${missed.join(', ')}`)
    lines.push('')
  }

  const rc = reviewContent
  if (rc.wins || rc.reflections || rc.tasks_notes || rc.projects_notes) {
    lines.push("USER'S REVIEW NOTES:")
    if (rc.wins)           lines.push(`Wins: ${rc.wins}`)
    if (rc.reflections)    lines.push(`Reflections: ${rc.reflections}`)
    if (rc.tasks_notes)    lines.push(`Task notes: ${rc.tasks_notes}`)
    if (rc.projects_notes) lines.push(`Project notes: ${rc.projects_notes}`)
    if (rc.tomorrow_notes) lines.push(`Tomorrow intentions: ${rc.tomorrow_notes}`)
    lines.push('')
  }

  const notesWithContent = recentNotes.filter(n => n.notes?.length > 0)
  if (notesWithContent.length > 0) {
    lines.push('RECENT DAILY NOTES (memory — last 14 days with content):')
    for (const n of notesWithContent.slice(0, 14)) {
      const text = n.notes.map(e => e.body).join(' | ')
      lines.push(`[${n.date}] ${text}`)
    }
    lines.push('')
  }

  lines.push('---')
  lines.push('Respond with this exact JSON structure:')
  lines.push(`{
  "top_of_mind": ["string", "string", "string"],
  "agenda": [
    { "time": "9:00 AM", "title": "string", "notes": "string or null" }
  ],
  "challenge": {
    "topic": "python|ai|llm|general",
    "difficulty": "beginner|intermediate|advanced",
    "prompt": "string",
    "hint": "string"
  },
  "quote": { "text": "string", "author": "string" },
  "suggestions": [
    { "type": "task_update|project_update|new_task|reminder|insight", "content": "string" }
  ]
}

Rules:
- top_of_mind: 3-5 items, reference actual project/task names
- agenda: 3-8 time blocks for TOMORROW, prioritise urgent/due tasks
- challenge: tailored to their current projects and interests from their notes
- quote: fitting to their current work or mindset, not generic
- suggestions: 2-6 actionable observations, flag stalled projects, forgotten tasks, patterns`)

  return lines.join('\n')
}

// ─── Response Parser ──────────────────────────────────────────────────────────

function parseResponse(raw) {
  // Strip accidental markdown fences
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(cleaned)

  return {
    top_of_mind: Array.isArray(parsed.top_of_mind) ? parsed.top_of_mind : [],
    agenda:      Array.isArray(parsed.agenda)       ? parsed.agenda      : [],
    challenge:   parsed.challenge ?? null,
    quote:       parsed.quote     ?? null,
    suggestions: Array.isArray(parsed.suggestions)  ? parsed.suggestions : [],
  }
}

// ─── Skill Entry Point ────────────────────────────────────────────────────────

// reviewId: the reviews.id to write suggestions into (may be null)
// reviewContent: user's typed notes { wins, reflections, tasks_notes, ... }
// Returns { result, tomorrowStr, suggestions }
export async function runDailyReview(reviewId, reviewContent = {}) {
  const ctx = await buildContext(reviewContent)

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user',   content: buildPrompt(ctx) },
  ]

  const raw    = await callAI(messages, { temperature: 0.5 })
  const result = parseResponse(raw)

  // Write to TOMORROW's daily note
  const tomorrow = new Date(ctx.today + 'T12:00:00')
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const tomorrowNote = await ensureNoteForDate(tomorrowStr)

  await Promise.all([
    result.top_of_mind.length > 0 && updateTopOfMind(tomorrowNote.id, result.top_of_mind),
    result.agenda.length > 0      && updateAgenda(tomorrowNote.id, result.agenda),
    result.challenge               && updateChallenge(tomorrowNote.id, result.challenge),
  ].filter(Boolean))

  // Build suggestion list — includes the quote as an insight
  const suggestions = [
    ...result.suggestions.map(s => ({
      ...s,
      id: crypto.randomUUID(),
      status: 'pending',
    })),
    result.quote && {
      type: 'insight',
      content: `Quote for tomorrow: "${result.quote.text}" — ${result.quote.author}`,
      id: crypto.randomUUID(),
      status: 'pending',
    },
  ].filter(Boolean)

  if (reviewId) {
    await updateSuggestions(reviewId, suggestions)
  }

  return { result, tomorrowStr, suggestions }
}
