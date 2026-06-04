import { supabase } from '../../supabase'
import { callAI } from '../client'
import { ensureNoteForDate, updateTopOfMind, updateAgenda, updateChallenge, updateQuote } from '../../api/daily'
import { updateSuggestions } from '../../api/reviews'

// ─── Context Builder ──────────────────────────────────────────────────────────

export async function buildReflectContext() {
  const today = new Date().toLocaleDateString('en-CA')

  const [projectsRes, activeTasksRes, inboxRes, notesRes, todayNoteRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, status, area, priority, end_date, description')
      .is('archived_at', null)
      .not('status', 'eq', 'completed')
      .order('updated_at', { ascending: false }),

    supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, project_id, projects(title)')
      .in('status', ['next_action', 'waiting', 'scheduled', 'queued'])
      .is('archived_at', null)
      .order('updated_at', { ascending: false }),

    supabase
      .from('tasks')
      .select('id, title')
      .eq('status', 'inbox')
      .is('archived_at', null)
      .limit(20),

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
  const stalledProjects  = projects.filter(p => p.status === 'in_progress' && !activeProjectIds.has(p.id))

  const today_date = new Date()
  const overdueTasks = activeTasks.filter(t => t.due_date && t.due_date < today)

  const habits = todayNote ? {
    morning_meds:    todayNote.habit_morning_meds,
    evening_meds:    todayNote.habit_evening_meds,
    journal:         todayNote.habit_journal,
    meditation:      todayNote.habit_meditation,
    breathwork:      todayNote.habit_breathwork,
    stretching:      todayNote.habit_stretching,
    health_tracking: todayNote.habit_health_tracking,
  } : {}

  return { today, projects, activeTasks, inboxTasks, recentNotes, stalledProjects, overdueTasks, habits }
}

// ─── Generate Opening Questions ───────────────────────────────────────────────

const QUESTIONS_SYSTEM = `You are the AI sidekick inside Focus Flow, a personal GTD system. Your job is to run a friendly end-of-day check-in — like a curious, supportive colleague grabbing a coffee with the user after work.

Generate 4-5 interview questions for today's daily review. Pull from their actual project names, task titles, and note history — make it feel personal, not generic. Mix it up: some questions can be practical ("did X actually happen today?"), some reflective, maybe one a little playful if the data gives you an opening.

Keep questions conversational — they should feel like something a real person would ask, not a corporate performance review form. No bullet points, no "Please describe your..." phrasing. Just talk to them.

Last question should always check on their energy/headspace going into tomorrow.

Respond with valid JSON only: { "questions": ["string", ...] }`

export async function generateReflectQuestions(ctx) {
  const { today, projects, activeTasks, stalledProjects, overdueTasks, habits, recentNotes } = ctx
  const lines = []

  lines.push(`TODAY: ${today}`)
  lines.push('')
  lines.push('ACTIVE PROJECTS:')
  projects.slice(0, 8).forEach(p => {
    lines.push(`- [${p.status}] ${p.title}${p.end_date ? ` (due ${p.end_date})` : ''}`)
  })
  lines.push('')
  lines.push('NEXT ACTIONS:')
  activeTasks.filter(t => t.status === 'next_action').slice(0, 6).forEach(t => {
    lines.push(`- ${t.title}${t.due_date ? ` [due ${t.due_date}]` : ''}`)
  })
  if (stalledProjects.length) {
    lines.push('')
    lines.push('STALLED (in progress, no active tasks):')
    stalledProjects.forEach(p => lines.push(`- ${p.title}`))
  }
  if (overdueTasks.length) {
    lines.push('')
    lines.push('OVERDUE:')
    overdueTasks.forEach(t => lines.push(`- ${t.title} (due ${t.due_date})`))
  }
  const completedHabits = Object.entries(habits).filter(([, v]) => v).map(([k]) => k.replace(/_/g, ' '))
  const missedHabits    = Object.entries(habits).filter(([, v]) => !v).map(([k]) => k.replace(/_/g, ' '))
  if (completedHabits.length || missedHabits.length) {
    lines.push('')
    lines.push("TODAY'S HABITS:")
    if (completedHabits.length) lines.push(`Completed: ${completedHabits.join(', ')}`)
    if (missedHabits.length)    lines.push(`Missed: ${missedHabits.join(', ')}`)
  }
  const notesWithContent = recentNotes.filter(n => n.notes?.length > 0).slice(0, 7)
  if (notesWithContent.length) {
    lines.push('')
    lines.push('RECENT NOTES (memory):')
    notesWithContent.forEach(n => {
      lines.push(`[${n.date}] ${n.notes.map(e => e.body).join(' | ')}`)
    })
  }

  lines.push('')
  lines.push('Generate 4-5 personalized interview questions. Reference actual project/task names. Last question should always be about energy/mindset going into tomorrow.')

  const messages = [
    { role: 'system', content: QUESTIONS_SYSTEM },
    { role: 'user', content: lines.join('\n') },
  ]

  const raw = await callAI(messages, { temperature: 0.6 })
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(cleaned)
  return Array.isArray(parsed.questions) ? parsed.questions : []
}

// ─── Generate Final Plan ──────────────────────────────────────────────────────

const PLAN_SYSTEM = `You are the AI sidekick inside Focus Flow, a personal GTD system. The user just finished their daily review chat — now it's time to turn what they said into tomorrow's plan.

Be specific and grounded in their actual data: real project names, real task titles, real patterns from the interview. Don't be generic. If something came up in the conversation, reflect it in the plan.

Tone: warm, direct, like you actually paid attention to what they said. No corporate-speak.
Respond with valid JSON only — no markdown, no preamble.`

export async function generateReflectPlan(ctx, conversation, scratchpadNote) {
  const { today, projects, activeTasks, stalledProjects, recentNotes } = ctx
  const lines = []

  lines.push(`TODAY: ${today}`)
  lines.push('')
  lines.push('ACTIVE PROJECTS:')
  projects.slice(0, 8).forEach(p => lines.push(`- [${p.status}] ${p.title}${p.end_date ? ` (due ${p.end_date})` : ''}`))
  lines.push('')
  lines.push('NEXT ACTIONS:')
  activeTasks.filter(t => t.status === 'next_action').slice(0, 8).forEach(t => lines.push(`- ${t.title}`))
  if (stalledProjects.length) {
    lines.push('')
    lines.push('STALLED PROJECTS:')
    stalledProjects.forEach(p => lines.push(`- ${p.title}`))
  }
  lines.push('')
  lines.push('INTERVIEW CONVERSATION:')
  conversation.forEach(({ role, content }) => {
    lines.push(`${role === 'ai' ? 'Coach' : 'User'}: ${content}`)
  })
  if (scratchpadNote?.trim()) {
    lines.push('')
    lines.push(`ADDITIONAL NOTES: ${scratchpadNote}`)
  }
  const notesWithContent = recentNotes.filter(n => n.notes?.length > 0).slice(0, 10)
  if (notesWithContent.length) {
    lines.push('')
    lines.push('RECENT NOTES (memory):')
    notesWithContent.forEach(n => lines.push(`[${n.date}] ${n.notes.map(e => e.body).join(' | ')}`))
  }
  lines.push('')
  lines.push(`Respond with this JSON:
{
  "top_of_mind": ["string", "string", "string"],
  "agenda": [{ "time": "9:00 AM", "title": "string", "notes": "string or null" }],
  "challenge": { "topic": "python|ai|llm|general", "difficulty": "beginner|intermediate|advanced", "prompt": "string", "hint": "string" },
  "quote": { "text": "string", "author": "string" },
  "suggestions": [{ "type": "task_update|project_update|new_task|reminder|insight", "content": "string" }]
}
Rules:
- top_of_mind: 3-5 items, use actual names from their data and interview answers
- agenda: 3-8 time blocks for TOMORROW based on what they said matters
- suggestions: 2-6 actionable items, prioritise what came up in the interview`)

  const messages = [
    { role: 'system', content: PLAN_SYSTEM },
    { role: 'user', content: lines.join('\n') },
  ]

  const raw    = await callAI(messages, { temperature: 0.5 })
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(cleaned)
}

// ─── Write Results to DB ──────────────────────────────────────────────────────

export async function writeReflectResults(reviewId, result) {
  const tomorrow = new Date(new Date().toLocaleDateString('en-CA') + 'T12:00:00')
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toLocaleDateString('en-CA')

  const tomorrowNote = await ensureNoteForDate(tomorrowStr)

  await Promise.all([
    result.top_of_mind?.length > 0          && updateTopOfMind(tomorrowNote.id, result.top_of_mind),
    result.agenda?.length > 0               && updateAgenda(tomorrowNote.id, result.agenda),
    result.challenge                         && updateChallenge(tomorrowNote.id, result.challenge),
    result.quote?.text                       && updateQuote(tomorrowNote.id, result.quote.text, result.quote.author),
  ].filter(Boolean))

  const suggestions = [
    ...( result.suggestions ?? []).map(s => ({ ...s, id: crypto.randomUUID(), status: 'pending' })),
    result.quote && {
      type: 'insight',
      content: `Quote for tomorrow: "${result.quote.text}" — ${result.quote.author}`,
      id: crypto.randomUUID(),
      status: 'pending',
    },
  ].filter(Boolean)

  if (reviewId) await updateSuggestions(reviewId, suggestions)

  return { tomorrowStr, suggestions, result }
}
