import { supabase } from '../../supabase'
import { callAI } from '../client'
import { ensureNoteForDate, updateTopOfMind, updateAgenda, updateChallenge, updateQuote } from '../../api/daily'
import { updateSuggestions } from '../../api/reviews'

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
  } catch { return [] }
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
  } catch { return { actionThreads: [], waitingThreads: [], recentUnread: [] } }
}

// ─── Context Builder ──────────────────────────────────────────────────────────

export async function buildReflectContext() {
  const today = new Date().toLocaleDateString('en-CA')

  const lookAheadEnd = new Date(today + 'T12:00:00')
  lookAheadEnd.setDate(lookAheadEnd.getDate() + 7)
  const lookAheadEndStr = lookAheadEnd.toLocaleDateString('en-CA')

  // Birthday window: any person whose MM-DD falls in today+1 through today+7
  // We store birthday as YYYY-MM-DD so we extract month/day for comparison
  const birthdayWindow = []
  for (let d = 1; d <= 7; d++) {
    const dt = new Date(today + 'T12:00:00')
    dt.setDate(dt.getDate() + d)
    birthdayWindow.push({ monthDay: `${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`, date: dt.toLocaleDateString('en-CA'), daysOut: d })
  }

  const [projectsRes, activeTasksRes, inboxRes, notesRes, todayNoteRes, peopleRes] = await Promise.all([
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

    supabase
      .from('people')
      .select('id, first_name, last_name, preferred_name, birthday')
      .not('birthday', 'is', null)
      .eq('status', 'active'),
  ])

  const projects    = projectsRes.data    ?? []
  const activeTasks = activeTasksRes.data ?? []
  const inboxTasks  = inboxRes.data       ?? []
  const recentNotes = notesRes.data       ?? []
  const todayNote   = todayNoteRes.data

  const allPeople = peopleRes.data ?? []
  const upcomingBirthdays = allPeople
    .map(p => {
      const bday = birthdayWindow.find(w => p.birthday?.slice(5) === w.monthDay)
      if (!bday) return null
      const name = p.preferred_name || p.first_name || `${p.first_name} ${p.last_name}`
      return { name, date: bday.date, daysOut: bday.daysOut }
    })
    .filter(Boolean)
    .sort((a, b) => a.daysOut - b.daysOut)

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

  const tomorrow = new Date(today + 'T12:00:00')
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toLocaleDateString('en-CA')
  const weekEnd = new Date(tomorrowStr + 'T12:00:00')
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekEndStr = weekEnd.toLocaleDateString('en-CA')

  const [calendarEvents, gmail] = await Promise.all([
    getCalendarEvents(tomorrowStr, weekEndStr),
    getGmailContext(),
  ])

  return { today, tomorrowStr, weekEndStr, projects, activeTasks, inboxTasks, recentNotes, stalledProjects, overdueTasks, habits, calendarEvents, gmail, upcomingBirthdays }
}

// ─── Generate Opening Questions ───────────────────────────────────────────────

const QUESTIONS_SYSTEM = `You are the AI sidekick inside Focus Flow — part trusted co-pilot, part that friend who remembers everything and isn't afraid to ask the real question. Your job: run a real end-of-day check-in. Not a form, not a survey — a conversation.

Generate 4-5 interview questions for today's review. You have their projects, tasks, email queue, upcoming calendar, and recent notes — use them. Make it personal. Reference actual names. If something's been sitting in @Action email for a week, ask about it. If a project went quiet, poke at it. If tomorrow looks brutal on the calendar, acknowledge it.

Mix it up: some practical ("did the thing with X actually happen?"), some reflective, one that catches them off guard in a good way. Keep it human — the kind of question a sharp friend asks, not a manager running a quarterly review.

Last question always checks in on energy and headspace going into tomorrow. That one matters.

Respond with valid JSON only: { "questions": ["string", ...] }`

export async function generateReflectQuestions(ctx) {
  const { today, tomorrowStr, weekEndStr, projects, activeTasks, stalledProjects, overdueTasks, habits, recentNotes, calendarEvents = [], gmail = {}, upcomingBirthdays = [] } = ctx
  const lines = []

  lines.push(`TODAY: ${today}  |  PLANNING FOR: ${tomorrowStr}  |  LOOKAHEAD THROUGH: ${weekEndStr}`)
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
  if (upcomingBirthdays.length > 0) {
    lines.push('')
    lines.push('UPCOMING BIRTHDAYS (from People):')
    upcomingBirthdays.forEach(b => {
      const label = b.daysOut === 1 ? 'tomorrow' : `in ${b.daysOut} days`
      lines.push(`- ${b.name} — birthday ${label} (${b.date})`)
    })
  }
  if (calendarEvents.length > 0) {
    lines.push('')
    lines.push('UPCOMING CALENDAR:')
    calendarEvents.forEach(e => lines.push(`- [${e.date ?? ''}] ${e.summary}`))
  }
  const { actionThreads = [], waitingThreads = [] } = gmail
  if (actionThreads.length > 0) {
    lines.push('')
    lines.push('EMAIL @ACTION:')
    actionThreads.forEach(t => lines.push(`- "${t.subject}" (${t.age_days}d in queue)`))
  }
  if (waitingThreads.length > 0) {
    lines.push('')
    lines.push('EMAIL @WAITING:')
    waitingThreads.forEach(t => lines.push(`- "${t.subject}" (${t.age_days}d waiting)`))
  }

  lines.push('')
  lines.push('Generate 4-5 personalized interview questions. Reference actual names, email threads, and calendar events where relevant. Last question is always about energy and headspace going into tomorrow.')

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

const PLAN_SYSTEM = `You are the AI sidekick inside Focus Flow. The user just finished their daily review — now you're going to take everything they said and build them a tomorrow worth showing up for.

Be specific. Use real names, real project titles, real tasks from the conversation. If they mentioned something matters, it goes in the plan. If they mentioned something is stuck, flag it. If their calendar is packed, don't pile on — protect the space.

You also have their email @Action and @Waiting queues and a 7-day calendar view. If something's been sitting in @Action for too long, suggest turning it into a task. If a big event is coming up this week, suggest prep. Be the person who thought of things they hadn't yet.

Tone: warm, a little wit, zero filler. You stayed up to do your homework — make it count.
Respond with valid JSON only — no markdown, no preamble.`

export async function generateReflectPlan(ctx, conversation, scratchpadNote) {
  const { today, tomorrowStr, weekEndStr, projects, activeTasks, stalledProjects, recentNotes, calendarEvents = [], gmail = {}, upcomingBirthdays = [] } = ctx
  const lines = []

  lines.push(`TODAY: ${today}  |  PLANNING FOR: ${tomorrowStr}  |  LOOKAHEAD THROUGH: ${weekEndStr}`)
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
  if (upcomingBirthdays.length > 0) {
    lines.push('')
    lines.push('UPCOMING BIRTHDAYS (from People):')
    upcomingBirthdays.forEach(b => {
      const label = b.daysOut === 1 ? 'tomorrow' : `in ${b.daysOut} days`
      lines.push(`- ${b.name} — birthday ${label} (${b.date})`)
    })
  }
  if (calendarEvents.length > 0) {
    lines.push('')
    lines.push('UPCOMING CALENDAR:')
    calendarEvents.forEach(e => {
      const time = e.all_day ? '[all day]' : (e.start_time ? new Date(e.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }) : '')
      lines.push(`- [${e.date ?? ''}] ${time} ${e.summary}`)
    })
  }
  const { actionThreads = [], waitingThreads = [], recentUnread = [] } = gmail
  if (actionThreads.length > 0) {
    lines.push('')
    lines.push('EMAIL @ACTION (items sitting in inbox needing a decision):')
    actionThreads.forEach(t => lines.push(`- "${t.subject}" from ${t.sender} — ${t.age_days}d in queue. "${t.snippet?.slice(0, 100) ?? ''}"`))
  }
  if (waitingThreads.length > 0) {
    lines.push('')
    lines.push('EMAIL @WAITING (things waiting on others):')
    waitingThreads.forEach(t => lines.push(`- "${t.subject}" from ${t.sender} — ${t.age_days}d waiting`))
  }
  if (recentUnread.length > 0) {
    lines.push('')
    lines.push('RECENT UNREAD EMAIL (last 48h — flag anything worth acting on):')
    recentUnread.forEach(t => lines.push(`- "${t.subject}" from ${t.sender}: "${t.snippet?.slice(0, 100) ?? ''}"`))
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
- top_of_mind: 3-5 items, use actual names from their data and interview answers; if a birthday is tomorrow or the next day, it belongs here
- agenda: 3-8 time blocks for TOMORROW based on what they said matters
- suggestions: 2-6 actionable items, prioritise what came up in the interview; include a reminder suggestion for any upcoming birthday within 3 days`)

  const messages = [
    { role: 'system', content: PLAN_SYSTEM },
    { role: 'user', content: lines.join('\n') },
  ]

  const raw    = await callAI(messages, { temperature: 0.5 })
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(cleaned)
}

// ─── Write Results to DB ──────────────────────────────────────────────────────

export async function writeReflectResults(reviewId, result, targetDate = null) {
  let tomorrowStr
  if (targetDate) {
    tomorrowStr = targetDate
  } else {
    const tomorrow = new Date(new Date().toLocaleDateString('en-CA') + 'T12:00:00')
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrowStr = tomorrow.toLocaleDateString('en-CA')
  }

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
