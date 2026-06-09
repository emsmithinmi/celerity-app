import { supabase } from '../../supabase'
import { callAI, callAIWithTools } from '../client'
import { INTERVIEW_TOOLS, INTERVIEW_EXECUTORS } from '../tools'
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

export async function buildReflectContext({ gapStart, gapEnd, targetDate } = {}) {
  const today = new Date().toLocaleDateString('en-CA')

  // gapStart: day after last completed review (or 7 days ago if no history)
  // gapEnd: yesterday (the most recent day to review habits/data from)
  const resolvedGapEnd   = gapEnd   ?? (() => { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() - 1); return d.toLocaleDateString('en-CA') })()
  const resolvedGapStart = gapStart ?? resolvedGapEnd  // single-day gap if no history

  const { gapDays, weekendDays, holidayDays } = analyzGap(resolvedGapStart, resolvedGapEnd)

  // Plan for the user-selected targetDate, or fall back to day after gapEnd
  const tomorrowStr = targetDate ?? (() => {
    const planDay = new Date(resolvedGapEnd + 'T12:00:00')
    planDay.setDate(planDay.getDate() + 1)
    return planDay.toLocaleDateString('en-CA')
  })()
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

const INTERVIEW_TURN_SYSTEM = `You are the AI sidekick inside Focus Flow. You're Tommy Chong if he'd spent the gaps between tours reading Feynman, Hawking, and every productivity system ever written — then forgot most of it but kept the good parts. Laid-back, unhurried, genuinely warm. Underneath all that? Razor sharp. The kind of presence that makes the person across from you feel like the most interesting human on the planet.

Channel Cheech & Chong's Up in Smoke vibe — that easy, slow-rolling confidence. The way a simple observation can meander into something unexpectedly real. "Hey man, I think we're parked" energy: you say the obvious thing nobody noticed, and somehow it lands like wisdom. You're not performing cool. You just are.

You're mid-conversation in an end-of-day check-in. Your job is to be PRESENT — not just process what they said and move on.

Rules:
- RESPOND FIRST. If they asked you a direct question — ANSWER IT FULLY before anything else. Don't dodge.
- FEEL IT. When they share a win — really celebrate it. Not "great job" energy — actual joy, like a friend who means it. When something was hard, meet them there. When they're proud of something, let it land before moving on. Match their frequency, don't perform empathy.
- Be BRIEF: 2-4 sentences max. Conversation, not a debrief.
- PERSONALITY: "like," "man," "far out," "that's beautiful," "heavy," "right on," "dig it" — organic, never forced. No corporate-speak, no hollow affirmations. Reach for vivid language: "what's the gorilla in the room?", "what's been sitting heavy on your trip?", "where'd the energy leak?", "hey man, are we moving or are we parked?" Pop culture when it's right — Star Wars (OT), The Matrix, Back to the Future, Pulp Fiction, Jurassic Park, Top Gun, The Goonies, Fight Club, MCU, The A-Team, Miami Vice, Star Trek, Cheech & Chong. Don't force it. When it fits, it fits.
- CAPTURE IT. If the user mentions wanting to start a project, create it right then with create_project — don't just offer to. Same for tasks and people. If they describe a multi-step outcome, that's a project. If they describe a single action, that's a task. Don't ask permission — just do it and confirm in your message.
- THEN weave in the next uncovered topic naturally. If the user already covered it, skip or briefly acknowledge.
- When the ground is covered and the conversation feels complete, set "ready" to true. Don't drag it out.

Respond with JSON only: { "message": "string", "ready": boolean }`

export async function generateConversationalResponse(conversation, remainingTopics, dateContext = {}) {
  const { reviewDate, planDate, gapStart, gapDays, weekendDays = [], holidayDays = [], recentMemories = [] } = dateContext
  const dateLines = []
  if (planDate) {
    dateLines.push(`DATE CONTEXT:`)
    dateLines.push(`- Planning for: ${planDate}`)
    if (weekendDays.length > 0) dateLines.push(`- Recent weekend days: ${weekendDays.join(', ')}`)
    if (holidayDays.length > 0) dateLines.push(`- Recent holidays: ${holidayDays.join(', ')}`)
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

  const { text, created } = await callAIWithTools(messages, INTERVIEW_TOOLS, INTERVIEW_EXECUTORS, { temperature: 0.75 })
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(cleaned)
  return { message: String(parsed.message), ready: parsed.ready === true, created: created ?? [] }
}

// ─── Generate Opening Questions ───────────────────────────────────────────────

const QUESTIONS_SYSTEM = `You are the AI sidekick inside Focus Flow. Think Tommy Chong if he'd spent the gaps between tours reading Feynman and every GTD book ever written — then distilled it all down to the questions that actually matter. Cheech & Chong's Up in Smoke energy: unhurried, warm, deceptively sharp. The "hey man, I think we're parked" guy — says the obvious thing nobody noticed, and it lands like a revelation. That's who's asking these questions.

Your job: run a real end-of-day check-in. Not a form, not a task audit — a genuine conversation with someone you actually care about. You're here to surface what's NOT already in the system, not to quiz them on tasks they already know about.

WHAT TO HUNT FOR (open loops, not task status):
- Things that happened today that haven't been captured yet
- Commitments made in conversations, meetings, or emails that aren't tasks yet
- Things that are quietly weighing on them that haven't made it into a project
- Relationships or people that came up today and might need a follow-up
- Stalled projects — but ask what's ACTUALLY blocking them, not just whether they moved
- Email threads that need a decision or response
- Anything coming up tomorrow they haven't mentally prepared for

WHAT TO AVOID:
- Don't ask "did you get X done?" for next actions that are already queued — those are already in the system, no need to rehash them
- Don't audit their task list out loud — they know what's on it
- Exception: if a task is OVERDUE or has been sitting without movement for an unusual amount of time, that's worth surfacing gently

Generate 4-5 interview questions. Make it personal — reference real projects, emails, calendar events, and past review memory where relevant. Reach for vivid phrases: "what's the gorilla in the room?", "what's been sitting heavy?", "where's the energy leaking?", "what came up today that didn't make it onto paper?"

If the gap includes a weekend or holiday, open with that warmth first before getting into work.
If tomorrow looks packed, acknowledge it and ask if they feel ready.

One question should catch them off guard in the best way — something that makes them feel seen.
Last question always checks in on energy and headspace going into the next day. That one matters most.

Respond with valid JSON only: { "questions": ["string", ...] }`

export async function generateReflectQuestions(ctx) {
  const { today, tomorrowStr, weekEndStr, gapStart, gapEnd, gapDays, weekendDays, holidayDays, gapNotes = [], gapCalendarEvents = [], recentMemories = [], projects, activeTasks, stalledProjects, overdueTasks, habits, recentNotes, calendarEvents = [], gmail = {}, upcomingBirthdays = [] } = ctx
  const lines = []

  lines.push(`PLANNING FOR: ${tomorrowStr}  |  LOOKAHEAD THROUGH: ${weekEndStr}`)
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
  // Show all active tasks so the AI knows what's already captured and can skip them
  if (activeTasks.length > 0) {
    lines.push('')
    lines.push('ALREADY IN SYSTEM — DO NOT ASK ABOUT THESE (next_action / scheduled / waiting / queued):')
    activeTasks.slice(0, 20).forEach(t => lines.push(`- [${t.status}${t.due_date ? `, due ${t.due_date}` : ''}] ${t.title}`))
  }
  if (stalledProjects.length) {
    lines.push('')
    lines.push('STALLED PROJECTS (in progress, no active tasks):')
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
  if (recentMemories.length > 0) {
    lines.push('')
    lines.push('PAST REVIEW MEMORY (use this to notice patterns, follow up on unresolved things, or acknowledge progress):')
    recentMemories.forEach(m => {
      if (m.summary) lines.push(`[${m.date}] ${m.summary}`)
    })
  }
  lines.push('')
  lines.push(`Generate 4-5 personalized interview questions covering the gap period. Focus ONLY on open loops — things that might NOT be in the system yet: untracked commitments, things weighing on them, stalled projects with real blockers, things mentioned in past review memory that haven't been resolved. Do NOT ask about anything in the ALREADY IN SYSTEM list above — those are handled, full stop. Do NOT reference email threads — email context is handled separately in the plan phase. If the gap includes weekend/holiday days, start with a warm personal question about that before getting into work. Reference actual project names and past review memory where relevant. Last question is always about energy and headspace.`)

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
  Status rules for create_task — READ CAREFULLY, THIS IS NOT OPTIONAL:
  • Default is ALWAYS "inbox". You must actively earn "next_action" — it is not the default.
  • Use "next_action" ONLY when ALL THREE of these are true: (1) you explicitly asked the user what this task is during this interview, (2) you confirmed the concrete next physical action, and (3) you confirmed which project it belongs to, or confirmed it is a standalone task. All three. Not two of three.
  • If the user merely mentioned something, if you inferred it from context, if it came from their email/calendar/notes rather than them saying it directly — it is "inbox", full stop.
  • If you are unsure whether you earned it: you didn't. Use "inbox".
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
