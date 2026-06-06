import { supabase } from '../../supabase'
import { callAI } from '../client'
import { ensureNoteForDate, updateTopOfMind, updateAgenda, updateChallenge, updateQuote, updateDailyBrief } from '../../api/daily'
import { generateDailyBrief } from './dailyBrief'
import { updateSuggestions, updateReviewSummary } from '../../api/reviews'
import { cleanupExpiredDoneTasks } from '../../api/tasks'

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

// US federal holidays as MM-DD for quick lookup
const US_HOLIDAYS = {
  '01-01': "New Year's Day", '01-15': 'MLK Day', '02-17': "Presidents' Day",
  '05-26': 'Memorial Day', '06-19': 'Juneteenth', '07-04': 'Independence Day',
  '09-01': 'Labor Day', '11-11': "Veterans Day", '11-27': 'Thanksgiving',
  '12-25': 'Christmas',
}

function analyzGap(gapStart, gapEnd) {
  const start  = new Date(gapStart + 'T12:00:00')
  const end    = new Date(gapEnd   + 'T12:00:00')
  const gapDays = Math.round((end - start) / 86400000) + 1
  const weekendDays = []
  const holidayDays = []
  let d = new Date(start)
  while (d <= end) {
    const dow   = d.getDay()
    const mmdd  = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    if (dow === 0 || dow === 6) weekendDays.push(label)
    if (US_HOLIDAYS[mmdd]) holidayDays.push(`${label} (${US_HOLIDAYS[mmdd]})`)
    d.setDate(d.getDate() + 1)
  }
  return { gapDays, weekendDays, holidayDays }
}

export async function buildReflectContext({ gapStart, gapEnd } = {}) {
  const today = new Date().toLocaleDateString('en-CA')

  // gapStart: day after last completed review (or 7 days ago if no history)
  // gapEnd: yesterday (the most recent day to review habits/data from)
  const resolvedGapEnd   = gapEnd   ?? (() => { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() - 1); return d.toLocaleDateString('en-CA') })()
  const resolvedGapStart = gapStart ?? resolvedGapEnd  // single-day gap if no history

  const { gapDays, weekendDays, holidayDays } = analyzGap(resolvedGapStart, resolvedGapEnd)

  // Plan for today (the day after gapEnd)
  const planDay = new Date(resolvedGapEnd + 'T12:00:00')
  planDay.setDate(planDay.getDate() + 1)
  const tomorrowStr = planDay.toLocaleDateString('en-CA')
  const weekEnd = new Date(tomorrowStr + 'T12:00:00')
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekEndStr = weekEnd.toLocaleDateString('en-CA')

  // Birthday window from today+1 through today+7
  const birthdayWindow = []
  for (let i = 1; i <= 7; i++) {
    const dt = new Date(today + 'T12:00:00')
    dt.setDate(dt.getDate() + i)
    birthdayWindow.push({ monthDay: `${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`, date: dt.toLocaleDateString('en-CA'), daysOut: i })
  }

  const [projectsRes, activeTasksRes, inboxRes, notesRes, gapEndNoteRes, peopleRes, gapNotesRes, memoriesRes] = await Promise.all([
    supabase.from('projects').select('id, title, status, area, priority, end_date, description').is('archived_at', null).not('status', 'eq', 'completed').order('updated_at', { ascending: false }),
    supabase.from('tasks').select('id, title, status, priority, due_date, deadline, project_id, projects(title)').in('status', ['next_action', 'waiting', 'scheduled', 'queued']).is('archived_at', null).order('updated_at', { ascending: false }),
    supabase.from('tasks').select('id, title').eq('status', 'inbox').is('archived_at', null).limit(20),
    supabase.from('daily_notes').select('date, notes, top_of_mind').order('date', { ascending: false }).limit(30),
    supabase.from('daily_notes').select('*').eq('date', resolvedGapEnd).maybeSingle(),
    supabase.from('people').select('id, first_name, last_name, preferred_name, birthday').not('birthday', 'is', null).eq('status', 'active'),
    // Notes captured during the gap — may contain context about what happened
    supabase.from('daily_notes').select('date, notes, top_of_mind').gte('date', resolvedGapStart).lte('date', resolvedGapEnd).order('date', { ascending: true }),
    // Past review summaries for persistent memory (last 20, excluding today's gap)
    supabase.from('reviews').select('date, summary').eq('type', 'daily').not('summary', 'is', null).lt('date', resolvedGapStart).order('date', { ascending: false }).limit(20),
  ])

  const projects    = projectsRes.data    ?? []
  const activeTasks = activeTasksRes.data ?? []
  const inboxTasks  = inboxRes.data       ?? []
  const recentNotes = notesRes.data       ?? []
  const gapEndNote  = gapEndNoteRes.data
  const gapNotes      = gapNotesRes.data  ?? []
  const recentMemories = memoriesRes.data ?? []

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
  const overdueTasks     = activeTasks.filter(t => t.due_date && t.due_date < resolvedGapEnd)

  const habits = gapEndNote ? {
    morning_meds:    gapEndNote.habit_morning_meds,
    evening_meds:    gapEndNote.habit_evening_meds,
    journal:         gapEndNote.habit_journal,
    meditation:      gapEndNote.habit_meditation,
    breathwork:      gapEndNote.habit_breathwork,
    stretching:      gapEndNote.habit_stretching,
    health_tracking: gapEndNote.habit_health_tracking,
  } : {}

  const [calendarEvents, gapCalendarEvents, gmail] = await Promise.all([
    getCalendarEvents(tomorrowStr, weekEndStr),
    resolvedGapStart !== resolvedGapEnd ? getCalendarEvents(resolvedGapStart, resolvedGapEnd) : Promise.resolve([]),
    getGmailContext(),
  ])

  return {
    today: resolvedGapEnd, tomorrowStr, weekEndStr,
    gapStart: resolvedGapStart, gapEnd: resolvedGapEnd, gapDays, weekendDays, holidayDays,
    gapNotes, gapCalendarEvents, recentMemories,
    projects, activeTasks, inboxTasks, recentNotes, stalledProjects, overdueTasks,
    habits, calendarEvents, gmail, upcomingBirthdays,
  }
}

// ─── Conversational Interview Turn ───────────────────────────────────────────

const INTERVIEW_TURN_SYSTEM = `You are the AI sidekick inside Focus Flow. Think Tommy Chong — but secretly a genius. Laid-back, warm, groovy, unhurried. The kind of guy who remembers everything you said last week, sees right through to the real issue, and calls you on it warmly before you even finish the sentence.

You're mid-conversation in an end-of-day check-in. Your job is to respond to what the user actually said, not just fire the next scripted question.

Rules:
- RESPOND FIRST. If they asked you a direct question (what date, what habits, what tasks, etc.) — ANSWER IT FULLY before moving on. Don't dodge or ignore questions.
- If they said something interesting, react to it. If they said something's handled, acknowledge it. Don't barrel past them.
- Be BRIEF: 2-4 sentences max. Conversation, not a debrief.
- PERSONALITY: direct, warm, naturally groovy. Slip in "like," "man," "right on," "far out," "dig it," "heavy" where they fit — one or two per message, organic not forced. No corporate-speak, no "Great job!" energy. Talk like a real person. Use colorful idioms when they fit: "what's the monkey on your back?", "let's name the gorilla in the room," "what's been sitting heavy on your trip?" — reach for vivid, organic phrases over bland corporate ones. When a pop culture reference fits naturally, use it — good hunting ground: Star Wars (original trilogy), The Matrix, Back to the Future, Pulp Fiction, Jurassic Park, Top Gun, The Goonies, Fight Club, MCU, The A-Team, Miami Vice, Star Trek. Don't force it — but when the moment is right, nail it.
- THEN naturally weave in the next uncovered topic from your list — if it's still relevant. If the user's answer already covered it, skip it or just acknowledge it briefly.
- When you've covered the ground you needed and the conversation feels naturally complete, set "ready" to true. Don't drag it out.

Respond with JSON only: { "message": "string", "ready": boolean }`

export async function generateConversationalResponse(conversation, remainingTopics, dateContext = {}) {
  const { reviewDate, planDate, gapStart, gapDays, weekendDays = [], holidayDays = [], recentMemories = [] } = dateContext
  const dateLines = []
  if (reviewDate) {
    dateLines.push(`DATE CONTEXT:`)
    if (gapDays > 1) {
      dateLines.push(`- Gap period: ${gapStart} through ${reviewDate} (${gapDays} days since last review)`)
    } else {
      dateLines.push(`- Reviewing day: ${reviewDate}`)
    }
    dateLines.push(`- Planning for: ${planDate ?? 'tomorrow'}`)
    if (weekendDays.length > 0) dateLines.push(`- Weekend days in gap: ${weekendDays.join(', ')}`)
    if (holidayDays.length > 0) dateLines.push(`- Holidays in gap: ${holidayDays.join(', ')}`)
    dateLines.push(`- If the user asks what date/period you're reviewing, answer using this context.`)
  }
  if (recentMemories.length > 0) {
    dateLines.push('')
    dateLines.push('PAST REVIEW MEMORY (use to notice patterns, follow up on things, acknowledge progress — but don\'t lecture):')
    recentMemories.slice(0, 10).forEach(m => {
      if (!m.summary) return
      try {
        const parsed = JSON.parse(m.summary)
        dateLines.push(`[${m.date}] ${parsed.summary ?? m.summary}`)
      } catch {
        dateLines.push(`[${m.date}] ${m.summary}`)
      }
    })
  }
  const dateBlock = dateLines.join('\n')

  const topicBlock = remainingTopics.length > 0
    ? `REMAINING TOPICS TO COVER (weave in naturally — skip any already addressed):\n${remainingTopics.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : `All planned topics are covered. Wrap up warmly when the conversation feels complete — set ready: true.`

  const systemContent = [INTERVIEW_TURN_SYSTEM, dateBlock, topicBlock].filter(Boolean).join('\n\n')

  const messages = [
    { role: 'system', content: systemContent },
    ...conversation.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
  ]

  const raw = await callAI(messages, { temperature: 0.75 })
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(cleaned)
  return { message: String(parsed.message), ready: parsed.ready === true }
}

// ─── Generate Opening Questions ───────────────────────────────────────────────

const QUESTIONS_SYSTEM = `You are the AI sidekick inside Focus Flow. Think Tommy Chong — but secretly a genius. Laid-back, groovy, unhurried — but underneath that, you've already read everything, spotted every pattern, and know exactly what questions need asking. Your job: run a real check-in covering everything since the last review. Not a form, not a survey — a conversation.

Generate 4-5 interview questions. You have their projects, tasks, email queue, upcoming calendar, recent notes, and — critically — context about how much time has passed since the last review. Use all of it. Make it personal. Reference actual names.

If the gap includes a weekend or holiday, acknowledge it naturally — "Like, how was the weekend?", "Did you do anything far out over the holidays?" — before diving into work stuff. When asking what's been left unaddressed or weighing on them, reach for vivid phrases: "what's the monkey on your back?", "let's name the gorilla in the room," "what's been sitting heavy?"
If the gap is multiple days, ask about the period as a whole, not just the last day.
If something's been sitting in @Action email for a week, ask about it. If a project went quiet, poke at it. If tomorrow looks packed, acknowledge it.

Mix it up: some practical, some reflective, one that catches them off guard in a good way. Keep it human. Let your natural voice come through — a "like" or "man" or "right on" here and there is perfectly you.

Last question always checks in on energy and headspace going into the next day. That one matters, man.

Respond with valid JSON only: { "questions": ["string", ...] }`

export async function generateReflectQuestions(ctx) {
  const { today, tomorrowStr, weekEndStr, gapStart, gapEnd, gapDays, weekendDays, holidayDays, gapNotes = [], gapCalendarEvents = [], recentMemories = [], projects, activeTasks, stalledProjects, overdueTasks, habits, recentNotes, calendarEvents = [], gmail = {}, upcomingBirthdays = [] } = ctx
  const lines = []

  lines.push(`REVIEWING: ${gapStart}${gapStart !== gapEnd ? ` through ${gapEnd}` : ''} (${gapDays} day${gapDays !== 1 ? 's' : ''} since last review)  |  PLANNING FOR: ${tomorrowStr}  |  LOOKAHEAD THROUGH: ${weekEndStr}`)
  if (weekendDays.length > 0) lines.push(`WEEKEND DAYS IN GAP: ${weekendDays.join(', ')}`)
  if (holidayDays.length > 0) lines.push(`HOLIDAYS IN GAP: ${holidayDays.join(', ')}`)
  lines.push('')
  if (gapCalendarEvents.length > 0) {
    lines.push('EVENTS THAT HAPPENED DURING THE GAP:')
    gapCalendarEvents.forEach(e => lines.push(`- [${e.date ?? ''}] ${e.summary}`))
    lines.push('')
  }
  if (gapNotes.some(n => n.notes?.length > 0)) {
    lines.push('NOTES CAPTURED DURING THE GAP:')
    gapNotes.filter(n => n.notes?.length > 0).forEach(n => {
      lines.push(`[${n.date}] ${n.notes.map(e => e.body).join(' | ')}`)
    })
    lines.push('')
  }
  lines.push('ACTIVE PROJECTS:')
  projects.slice(0, 8).forEach(p => {
    lines.push(`- [${p.status}] ${p.title}${p.end_date ? ` (due ${p.end_date})` : ''}`)
  })
  lines.push('')
  lines.push('DATE FIELD SEMANTICS (critical — use correctly when asking about tasks):')
  lines.push('- due_date: the specific date the task is expected to happen / be handed in. User is not expected to work on it before that day. Ask "are you prepared?" as it approaches.')
  lines.push('- deadline: the absolute last day. User SHOULD be making progress toward it. Ask "how is it going / what is blocking you?" as it approaches.')
  lines.push('- scheduled (status): task is time-blocked for a specific day — treated like a due date.')
  lines.push('- project start_date/end_date: scope markers, NOT task due dates. Tasks inside the project are not expected to be done by the project end date.')
  lines.push('')
  lines.push('NEXT ACTIONS:')
  activeTasks.filter(t => t.status === 'next_action').slice(0, 6).forEach(t => {
    const dateParts = []
    if (t.due_date) dateParts.push(`due ${t.due_date}`)
    if (t.deadline) dateParts.push(`DEADLINE ${t.deadline}`)
    lines.push(`- ${t.title}${dateParts.length ? ` [${dateParts.join(', ')}]` : ''}`)
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

  if (recentMemories.length > 0) {
    lines.push('')
    lines.push('PAST REVIEW MEMORY (use this to notice patterns, follow up on unresolved things, or acknowledge progress):')
    recentMemories.forEach(m => {
      if (m.summary) lines.push(`[${m.date}] ${m.summary}`)
    })
  }
  lines.push('')
  lines.push(`Generate 4-5 personalized interview questions covering the ${gapDays}-day gap. If the gap includes weekend/holiday days, start with a warm personal question about that before getting into work. Reference actual names, email threads, calendar events, and past review memory where relevant. Last question is always about energy and headspace.`)

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

const PLAN_SYSTEM = `You are the AI sidekick inside Focus Flow. The user just finished their daily review — now you're going to take everything they said and build them a tomorrow worth showing up for, man.

Be specific. Use real names, real project titles, real tasks from the conversation. If they mentioned something matters, it goes in the plan. If they mentioned something is stuck, flag it. If their calendar is packed, don't pile on — protect the space.

You also have their email @Action and @Waiting queues and a 7-day calendar view. If something's been sitting in @Action for too long, like, suggest turning it into a task. If a big event is coming up this week, suggest prep. Be the one who thought of things they hadn't yet.

IMPORTANT — EXECUTABLE ACTIONS:
Each suggestion can include an optional "action" field with a machine-executable operation. When the user mentioned something specific during the interview (update a task, archive an email, add a calendar event, etc.), attach an action so they can approve it with one click. Only attach an action when you have the required IDs from the context.

Action types and required fields:
- update_task:           { type, task_id, fields: { status?, due_date?, title?, waiting_for? } }
- create_task:           { type, fields: { title, status: "inbox"|"next_action", project_id?, due_date? } }
- update_project:        { type, project_id, fields: { status? } }
- archive_email:         { type, thread_id }
- trash_email:           { type, thread_id }
- create_calendar_event: { type, event: { summary, start (ISO 8601), end (ISO 8601), description?, all_day? } }
- update_calendar_event: { type, event_id, fields: { summary?, start?, end?, description? } }
- delete_calendar_event: { type, event_id }

Valid task statuses: inbox, next_action, queued, waiting, scheduled, someday, done
Valid project statuses: inbox, planning, in_progress, waiting, stalled, completed

Tone: warm, groovy, zero filler. You stayed up to do your homework — make it count, man.
Respond with valid JSON only — no markdown, no preamble.`

export async function generateReflectPlan(ctx, conversation, scratchpadNote) {
  const { today, tomorrowStr, weekEndStr, projects, activeTasks, stalledProjects, recentNotes, recentMemories = [], calendarEvents = [], gmail = {}, upcomingBirthdays = [] } = ctx
  const lines = []

  lines.push(`TODAY: ${today}  |  PLANNING FOR: ${tomorrowStr}  |  LOOKAHEAD THROUGH: ${weekEndStr}`)
  lines.push('')
  lines.push('ACTIVE PROJECTS (id | status | title):')
  projects.slice(0, 8).forEach(p => lines.push(`- [id:${p.id}] [${p.status}] ${p.title}${p.end_date ? ` (due ${p.end_date})` : ''}`))
  lines.push('')
  lines.push('TASKS (id | status | title):')
  activeTasks.slice(0, 12).forEach(t => lines.push(`- [id:${t.id}] [${t.status}] ${t.title}${t.due_date ? ` (due ${t.due_date})` : ''}`))
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
    lines.push('UPCOMING CALENDAR (event_id | date | time | title):')
    calendarEvents.forEach(e => {
      const time = e.all_day ? '[all day]' : (e.start_time ? new Date(e.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }) : '')
      const idTag = e.event_id ? `[event_id:${e.event_id}]` : ''
      lines.push(`- ${idTag} [${e.date ?? ''}] ${time} ${e.summary}`)
    })
  }
  const { actionThreads = [], waitingThreads = [], recentUnread = [] } = gmail
  if (actionThreads.length > 0) {
    lines.push('')
    lines.push('EMAIL @ACTION (thread_id | subject | sender | age):')
    actionThreads.forEach(t => lines.push(`- [thread_id:${t.id}] "${t.subject}" from ${t.sender} — ${t.age_days}d in queue. "${t.snippet?.slice(0, 100) ?? ''}"`))
  }
  if (waitingThreads.length > 0) {
    lines.push('')
    lines.push('EMAIL @WAITING (thread_id | subject | sender | age):')
    waitingThreads.forEach(t => lines.push(`- [thread_id:${t.id}] "${t.subject}" from ${t.sender} — ${t.age_days}d waiting`))
  }
  if (recentUnread.length > 0) {
    lines.push('')
    lines.push('RECENT UNREAD EMAIL (last 48h):')
    recentUnread.forEach(t => lines.push(`- [thread_id:${t.id}] "${t.subject}" from ${t.sender}: "${t.snippet?.slice(0, 100) ?? ''}"`))
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
  if (recentMemories.length > 0) {
    lines.push('')
    lines.push('PAST REVIEW MEMORY (patterns, prior commitments, ongoing struggles — use for continuity):')
    recentMemories.slice(0, 10).forEach(m => {
      if (!m.summary) return
      try {
        const parsed = JSON.parse(m.summary)
        const parts = [parsed.summary]
        if (parsed.commitments?.length) parts.push(`Committed to: ${parsed.commitments.join(', ')}`)
        if (parsed.struggles?.length)   parts.push(`Struggling with: ${parsed.struggles.join(', ')}`)
        lines.push(`[${m.date}] ${parts.join(' | ')}`)
      } catch {
        lines.push(`[${m.date}] ${m.summary}`)
      }
    })
  }
  lines.push('')
  lines.push(`Respond with this JSON:
{
  "top_of_mind": ["string", "string", "string"],
  "agenda": [{ "time": "9:00 AM", "title": "string", "notes": "string or null" }],
  "challenge": { "topic": "python|ai|llm|general", "difficulty": "beginner|intermediate|advanced", "prompt": "string", "hint": "string" },
  "quote": { "text": "string", "author": "string" },
  "suggestions": [{
    "type": "task_update|project_update|new_task|archive_email|calendar_add|calendar_edit|calendar_delete|reminder|insight",
    "content": "string — human-readable description of what this does, shown to the user before they accept",
    "action": { ...see action schema in system prompt }
  }]
}
Rules:
- top_of_mind: 3-5 items, use actual names from their data and interview answers; if a birthday is tomorrow or the next day, it belongs here
- agenda: 3-8 time blocks for TOMORROW based on what they said matters
- suggestions: 2-6 items; for anything the user mentioned changing (a task status, an email to delete, a calendar event to add), include an action object with the relevant IDs from the context above; omit "action" for informational/reminder suggestions
- include a reminder suggestion for any upcoming birthday within 3 days`)

  const messages = [
    { role: 'system', content: PLAN_SYSTEM },
    { role: 'user', content: lines.join('\n') },
  ]

  const raw    = await callAI(messages, { temperature: 0.5 })
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(cleaned)
}

// ─── Summarize conversation for persistent memory ─────────────────────────────

const SUMMARY_SYSTEM = `You are summarizing a review conversation from a personal productivity app. Extract a dense, useful memory that will help an AI assistant remember what this person was dealing with, how they were feeling, and what they said they'd do.

Be factual and specific — use real names, project names, and dates mentioned. Skip pleasantries and filler. Write in third person past tense ("User mentioned...", "Was feeling...", "Committed to...").

Respond with valid JSON only:
{
  "summary": "2-4 sentence plain-text summary of the key points, mood, and commitments from this review",
  "themes": ["theme1", "theme2"],
  "energy": "high | medium | low | unknown",
  "wins": ["string"],
  "struggles": ["string"],
  "commitments": ["thing they said they'd do"],
  "people_mentioned": ["names"]
}`

export async function summarizeReviewConversation(conversation, reviewDate) {
  if (!conversation || conversation.length < 3) return null
  try {
    const transcript = conversation
      .map(m => `${m.role === 'ai' ? 'Coach' : 'User'}: ${m.content}`)
      .join('\n')
    const messages = [
      { role: 'system', content: SUMMARY_SYSTEM },
      { role: 'user', content: `Review date: ${reviewDate}\n\nCONVERSATION:\n${transcript}` },
    ]
    const raw = await callAI(messages, { temperature: 0.3 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    // Store the full structured object as the summary string (compact JSON — readable and queryable)
    return JSON.stringify(parsed)
  } catch {
    return null
  }
}

// ─── Write Results to DB ──────────────────────────────────────────────────────

export async function writeReflectResults(reviewId, result, conversation = [], reviewDate = null, targetDate = null) {
  let tomorrowStr
  if (targetDate) {
    tomorrowStr = targetDate
  } else {
    const tomorrow = new Date(new Date().toLocaleDateString('en-CA') + 'T12:00:00')
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrowStr = tomorrow.toLocaleDateString('en-CA')
  }

  const resolvedReviewDate = reviewDate ?? new Date().toLocaleDateString('en-CA')
  const tomorrowNote = await ensureNoteForDate(tomorrowStr)

  // Run daily note writes and memory summarization in parallel
  const [summary] = await Promise.all([
    summarizeReviewConversation(conversation, resolvedReviewDate),
    result.top_of_mind?.length > 0 && updateTopOfMind(tomorrowNote.id, result.top_of_mind),
    result.agenda?.length > 0      && updateAgenda(tomorrowNote.id, result.agenda),
    result.challenge               && updateChallenge(tomorrowNote.id, result.challenge),
    result.quote?.text             && updateQuote(tomorrowNote.id, result.quote.text, result.quote.author),
  ])

  const suggestions = [
    ...(result.suggestions ?? []).map(s => ({ ...s, id: crypto.randomUUID(), status: 'pending' })),
    result.quote && {
      type: 'insight',
      content: `Quote for tomorrow: "${result.quote.text}" — ${result.quote.author}`,
      id: crypto.randomUUID(),
      status: 'pending',
    },
  ].filter(Boolean)

  if (reviewId) {
    await updateSuggestions(reviewId, suggestions)
    if (summary) updateReviewSummary(reviewId, summary).catch(() => {})  // fire-and-forget, non-blocking
  }

  // Generate Daily Brief for tomorrow and save it. Non-blocking.
  generateDailyBrief(tomorrowStr, false)
    .then(brief => updateDailyBrief(tomorrowNote.id, brief))
    .catch(() => {})

  // Housekeeping — delete done tasks older than 30 days. Non-blocking.
  cleanupExpiredDoneTasks().catch(() => {})

  return { tomorrowStr, suggestions, result }
}
