import { supabase } from '../../supabase'
import { callAI } from '../client'
import { ensureNoteForDate, updateTopOfMind, updateAgenda, updateChallenge, updateQuote } from '../../api/daily'
import { updateSuggestions } from '../../api/reviews'
import { selectCandidates } from '../../quotes'

async function getTomorrowCalendarEvents(tomorrowStr) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const res = await fetch(`${supabaseUrl}/functions/v1/google-calendar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ date: tomorrowStr }),
    })

    if (!res.ok) return []
    const { events, error } = await res.json()
    if (error === 'no_integration') return [] // user hasn't connected Google yet
    return events ?? []
  } catch {
    return []
  }
}

// ─── Context Builder ──────────────────────────────────────────────────────────

async function buildContext(reviewContent = {}) {
  const today = new Date().toLocaleDateString('en-CA')

  // Fetch the most recent completed challenge for critique + progression
  const recentChallengeRes = await supabase
    .from('daily_notes')
    .select('date, code_challenge')
    .not('code_challenge', 'is', null)
    .order('date', { ascending: false })
    .limit(10)

  const lastCompleted = (recentChallengeRes.data ?? [])
    .find(n => n.code_challenge?.completed === true)

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

    // Last 30 days of daily notes — this is the "memory" + recent quotes
    supabase
      .from('daily_notes')
      .select('date, notes, top_of_mind, quote')
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

  // Tomorrow's calendar events
  const tomorrow = new Date(today + 'T12:00:00')
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toLocaleDateString('en-CA')
  const calendarEvents = await getTomorrowCalendarEvents(tomorrowStr)

  // Pre-select weighted quote candidates, excluding recently used quotes
  const recentQuoteTexts = (notesRes.data ?? []).map(n => n.quote).filter(Boolean)
  const quoteCandidates = selectCandidates(recentQuoteTexts, 30)

  return { today, tomorrowStr, projects, activeTasks, inboxTasks, inboxCount: inboxTasks.length, recentNotes, stalledRisk, habits, reviewContent, lastCompletedChallenge: lastCompleted ?? null, calendarEvents, quoteCandidates }
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the AI sidekick inside Focus Flow, a personal GTD system. Your job is to help the user wrap up their day and set up a good tomorrow.

You have their projects, tasks, habits, and the last 30 days of daily notes to work with. Use them — make it personal, reference real names, notice patterns. Nobody wants generic advice from someone who clearly wasn't paying attention.

Tone: warm, direct, a little human. Like a sharp friend who actually knows their work. Not a corporate productivity bot.

Respond with valid JSON only — no markdown, no preamble, no explanation outside the JSON.`

// ─── User Prompt Builder ──────────────────────────────────────────────────────

function buildPrompt(ctx) {
  const { today, tomorrowStr, projects, activeTasks, inboxCount, inboxTasks, recentNotes, stalledRisk, habits, reviewContent, lastCompletedChallenge, calendarEvents, quoteCandidates } = ctx
  const lines = []

  lines.push(`TODAY: ${today}  |  PLANNING FOR: ${tomorrowStr}`)
  lines.push('')

  if (calendarEvents.length > 0) {
    lines.push(`TOMORROW'S CALENDAR (${tomorrowStr}):`)
    for (const e of calendarEvents) {
      if (e.all_day) {
        lines.push(`- [all day] ${e.summary}${e.calendar_name ? ` (${e.calendar_name})` : ''}`)
      } else {
        const start = e.start_time ? new Date(e.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }) : '?'
        const end   = e.end_time   ? new Date(e.end_time).toLocaleTimeString('en-US',   { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }) : null
        lines.push(`- ${start}${end ? ` – ${end}` : ''}: ${e.summary}${e.notes ? ` — ${e.notes}` : ''}`)
      }
    }
    lines.push('')
  }

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

  // Quote candidates — weighted, recent-filtered selection from the pool
  if (quoteCandidates.length > 0) {
    lines.push('QUOTE CANDIDATES (pick the most contextually fitting one for tomorrow):')
    quoteCandidates.forEach((q, i) => {
      lines.push(`${i + 1}. [${q.category}] "${q.text}" — ${q.author}`)
    })
    lines.push('Return the chosen quote EXACTLY as written above (text and author must match precisely).')
    lines.push('')
  }

  // Challenge context — only include if there's a completed one to build from
  if (lastCompletedChallenge) {
    const c = lastCompletedChallenge.code_challenge
    lines.push(`LAST COMPLETED CHALLENGE (${lastCompletedChallenge.date}):`)
    lines.push(`Topic: ${c.topic} | Difficulty: ${c.difficulty}`)
    lines.push(`Prompt: ${c.prompt}`)
    if (c.user_response) lines.push(`Their answer: ${c.user_response.slice(0, 400)}`)
    lines.push('Generate a NEW challenge that critiques their answer and builds on the same concept or progresses to the next idea.')
    lines.push('')
  } else {
    lines.push('NO completed challenge exists yet. Generate a fresh beginner-friendly challenge.')
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
    "hint": "string",
    "ai_feedback": "string or null — critique of their last answer if one exists, otherwise null"
  },
  "quote": { "text": "string", "author": "string" },
  "suggestions": [
    { "type": "task_update|project_update|new_task|reminder|insight", "content": "string" }
  ]
}

Rules:
- top_of_mind: 3-5 items, reference actual project/task names
- agenda: use TOMORROW'S CALENDAR as the backbone; only include times that are real calendar events; tasks/projects show as all-day items in the app separately so do not duplicate them here — only output actual calendar event time blocks
- challenge: always generate one; if last was completed, critique it in ai_feedback and build the new prompt on it
- quote: fitting to their current work or mindset, not generic
- suggestions: 2-6 actionable observations, flag stalled projects, forgotten tasks, patterns`)

  return lines.join('\n')
}

// ─── Response Parser ──────────────────────────────────────────────────────────

function parseResponse(raw) {
  // Strip accidental markdown fences
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(cleaned)

  const challenge = parsed.challenge ?? null

  return {
    top_of_mind: Array.isArray(parsed.top_of_mind) ? parsed.top_of_mind : [],
    agenda:      Array.isArray(parsed.agenda)       ? parsed.agenda      : [],
    challenge:   challenge ? { ...challenge, completed: false, user_response: null } : null,
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

  const { tomorrowStr } = ctx
  const tomorrowNote = await ensureNoteForDate(tomorrowStr)

  await Promise.all([
    result.top_of_mind.length > 0 && updateTopOfMind(tomorrowNote.id, result.top_of_mind),
    result.agenda.length > 0      && updateAgenda(tomorrowNote.id, result.agenda),
    result.challenge               && updateChallenge(tomorrowNote.id, result.challenge),
    result.quote                   && updateQuote(tomorrowNote.id, result.quote.text, result.quote.author),
  ].filter(Boolean))

  const suggestions = result.suggestions.map(s => ({
    ...s,
    id: crypto.randomUUID(),
    status: 'pending',
  }))

  if (reviewId) {
    await updateSuggestions(reviewId, suggestions)
  }

  return { result, tomorrowStr, suggestions }
}
