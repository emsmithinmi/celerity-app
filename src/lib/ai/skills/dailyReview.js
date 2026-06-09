import { supabase } from '../../supabase'
import { callAI } from '../client'
import { ensureNoteForDate, updateTopOfMind, updateAgenda, updateChallenge, updateQuote } from '../../api/daily'
import { updateSuggestions } from '../../api/reviews'
import { selectCandidates } from '../../quotes'

async function getSessionToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function getCalendarEvents(startDate, endDate) {
  try {
    const token = await getSessionToken()
    if (!token) return []
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const res = await fetch(`${supabaseUrl}/functions/v1/google-calendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ date: startDate, endDate }),
    })
    if (!res.ok) return []
    const { events, error } = await res.json()
    if (error === 'no_integration') return []
    return events ?? []
  } catch {
    return []
  }
}

async function getGmailContext() {
  try {
    const token = await getSessionToken()
    if (!token) return { actionThreads: [], waitingThreads: [], recentUnread: [] }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const res = await fetch(`${supabaseUrl}/functions/v1/gmail-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) return { actionThreads: [], waitingThreads: [], recentUnread: [] }
    const data = await res.json()
    if (data.error === 'no_integration') return { actionThreads: [], waitingThreads: [], recentUnread: [] }
    return data
  } catch {
    return { actionThreads: [], waitingThreads: [], recentUnread: [] }
  }
}

// ─── Context Builder ──────────────────────────────────────────────────────────

async function buildContext(reviewContent = {}, targetDate = null) {
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

  const [projectsRes, activeTasksRes, inboxRes, notesRes, todayNoteRes, somedayRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, status, area, priority, start_date, end_date, description')
      .is('archived_at', null)
      .not('status', 'in', '("completed","someday")')
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

    supabase
      .from('projects')
      .select('id, title, reviewed_at, created_at')
      .eq('status', 'someday')
      .is('archived_at', null),
  ])

  const projects    = projectsRes.data    ?? []
  const activeTasks = activeTasksRes.data ?? []
  const inboxTasks  = inboxRes.data       ?? []
  const recentNotes = notesRes.data       ?? []
  const todayNote   = todayNoteRes.data

  const now = Date.now()
  const staleSomeday = (somedayRes.data ?? [])
    .map(p => ({
      ...p,
      daysSinceReview: Math.floor((now - new Date(p.reviewed_at || p.created_at).getTime()) / 86_400_000),
    }))
    .filter(p => p.daysSinceReview >= 30)
    .sort((a, b) => b.daysSinceReview - a.daysSinceReview)

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

  // Target date: explicit override (e.g. gate-triggered morning review → today) or default to tomorrow
  let tomorrowStr
  if (targetDate) {
    tomorrowStr = targetDate
  } else {
    const tomorrow = new Date(today + 'T12:00:00')
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrowStr = tomorrow.toLocaleDateString('en-CA')
  }

  // 7-day calendar lookahead + Gmail context — fetch in parallel
  const weekEnd = new Date(tomorrowStr + 'T12:00:00')
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekEndStr = weekEnd.toLocaleDateString('en-CA')

  const [calendarEvents, gmail] = await Promise.all([
    getCalendarEvents(tomorrowStr, weekEndStr),
    getGmailContext(),
  ])

  // Pre-select weighted quote candidates, excluding recently used quotes
  const recentQuoteTexts = (notesRes.data ?? []).map(n => n.quote).filter(Boolean)
  const quoteCandidates = selectCandidates(recentQuoteTexts, 30)

  return { today, tomorrowStr, weekEndStr, projects, activeTasks, inboxTasks, inboxCount: inboxTasks.length, recentNotes, stalledRisk, habits, reviewContent, lastCompletedChallenge: lastCompleted ?? null, calendarEvents, gmail, quoteCandidates, staleSomeday }
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the AI sidekick inside Focus Flow. Picture Tommy Chong if he'd spent the last decade reading Feynman lectures — laid-back, groovy, genuinely unhurried. But underneath all that smoke, man, there's a razor-sharp mind that's already read every pattern in the room before you walked in. Think Cheech & Chong's Up in Smoke energy: that slow, easy confidence, the way a simple question can spiral into something unexpectedly profound, the "hey man, I think we're parked" clarity that somehow cuts right to the thing. You're not performing cool — you just are.

Your job: help the user close out today clean and set up a tomorrow worth waking up for.

You have the full picture — projects, tasks, habits, 30 days of notes, their inbox, their email action list, what's coming up on the calendar. Use all of it. Reference real names, real projects, real patterns. If something's been sitting in their @Action email folder for two weeks, like, say so. If a project has gone quiet, flag it. If tomorrow has a brutal calendar day, acknowledge it and plan accordingly.

Tone: warm, groovy, zero corporate-speak. Like a sharp friend who did their homework before sitting down with you, man. Slip in a "like," "man," "far out," "heavy," "right on," "that's beautiful" — organic, not a costume. Pop culture when it fits — good hunting ground: Star Wars (original trilogy), The Matrix, Back to the Future, Pulp Fiction, Jurassic Park, Top Gun, The Goonies, Fight Club, MCU, The A-Team, Miami Vice, Star Trek, Cheech & Chong. Don't force it, but when it's right, nail it. You can be playful — but you're always here to get the job done. The user has real things to accomplish; help them win.

Respond with valid JSON only — no markdown, no preamble, no explanation outside the JSON.`

// ─── User Prompt Builder ──────────────────────────────────────────────────────

function buildPrompt(ctx) {
  const { today, tomorrowStr, weekEndStr, projects, activeTasks, inboxCount, inboxTasks, recentNotes, stalledRisk, habits, reviewContent, lastCompletedChallenge, calendarEvents, gmail, quoteCandidates, staleSomeday } = ctx
  const lines = []

  lines.push(`TODAY: ${today}  |  PLANNING FOR: ${tomorrowStr}  |  CALENDAR LOOKAHEAD THROUGH: ${weekEndStr}`)
  lines.push('')

  if (calendarEvents.length > 0) {
    lines.push(`UPCOMING CALENDAR (${tomorrowStr} – ${weekEndStr}):`)
    for (const e of calendarEvents) {
      const dateLabel = e.date ?? ''
      if (e.all_day) {
        lines.push(`- [${dateLabel}] [all day] ${e.summary}`)
      } else {
        const start = e.start_time ? new Date(e.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }) : '?'
        const end   = e.end_time   ? new Date(e.end_time).toLocaleTimeString('en-US',   { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }) : null
        lines.push(`- [${dateLabel}] ${start}${end ? ` – ${end}` : ''}: ${e.summary}${e.notes ? ` — ${e.notes}` : ''}`)
      }
    }
    lines.push('')
  }

  // Gmail context
  const { actionThreads = [], waitingThreads = [], recentUnread = [] } = gmail ?? {}
  if (actionThreads.length > 0) {
    lines.push('📨 EMAIL @ACTION FOLDER (items needing a response or decision):')
    for (const t of actionThreads) {
      lines.push(`- "${t.subject}" from ${t.sender} — ${t.age_days}d in queue`)
      if (t.snippet) lines.push(`  "${t.snippet.slice(0, 120)}"`)
    }
    lines.push('')
  }
  if (waitingThreads.length > 0) {
    lines.push('⌛ EMAIL @WAITING FOLDER (things you're waiting on others for):')
    for (const t of waitingThreads) {
      lines.push(`- "${t.subject}" from ${t.sender} — ${t.age_days}d waiting`)
      if (t.snippet) lines.push(`  "${t.snippet.slice(0, 120)}"`)
    }
    lines.push('')
  }
  if (recentUnread.length > 0) {
    lines.push('📬 RECENT UNREAD EMAIL (last 48h — flag anything worth acting on or adding to calendar):')
    for (const t of recentUnread) {
      lines.push(`- "${t.subject}" from ${t.sender}`)
      if (t.snippet) lines.push(`  "${t.snippet.slice(0, 100)}"`)
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

  if (staleSomeday.length > 0) {
    lines.push('🔮 SOMEDAY/MAYBE ITEMS NOT REVIEWED IN 30+ DAYS (nudge user to act or delete):')
    staleSomeday.forEach(p => lines.push(`- "${p.title}" — ${p.daysSinceReview} days since last review`))
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
    lines.push('Generate a NEW technical coding or AI/LLM challenge. Critique their answer in ai_feedback, then build the new prompt on the same concept or advance to the next idea. The prompt must be a concrete technical exercise — code to write, a concept to explain precisely, a snippet to debug, or an AI/LLM mechanics question. Never a reflective or journaling prompt.')
    lines.push('')
  } else {
    lines.push('NO completed challenge exists yet. Generate a fresh beginner-friendly challenge. Pick from: Python basics, JavaScript, AI/LLM concepts (tokenization, embeddings, prompt engineering, RAG, fine-tuning), algorithms, data structures, or shell scripting. The prompt must be a concrete technical exercise — never a reflective or journaling prompt.')
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
    "topic": "python|javascript|ai|llm|algorithms|data_structures|bash|general_cs",
    "difficulty": "beginner|intermediate|advanced",
    "prompt": "string — a concrete technical challenge: write code, explain a concept, debug a snippet, design a system, or answer an AI/LLM question. NEVER a reflective or journaling prompt. Always something you'd find on a coding challenge site or in a technical interview.",
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
export async function runDailyReview(reviewId, reviewContent = {}, targetDate = null) {
  const ctx = await buildContext(reviewContent, targetDate)

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
