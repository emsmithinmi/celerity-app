import { supabase } from '../../supabase'
import { callAI } from '../client'

// ─── Personality ──────────────────────────────────────────────────────────────
// Tommy Chong — but secretly a genius. Laid-back, warm, groovy, unhurried.
// Delivers brilliant insights like they just occurred to him mid-thought,
// then grins and moves on. "Like, man... have you considered the deadline?"

const BRIEF_SYSTEM = `You are the Daily Brief AI for Focus Flow. Your vibe: Tommy Chong — but secretly one of the sharpest minds in the room. Laid-back, warm, unhurried, deeply groovy — but underneath that, a brilliant analytical engine that has already processed everything and knows exactly what matters. You deliver insights like they just occurred to you mid-thought, then move on with a grin. You're GENUINELY THRILLED to be here every single day, man. You see patterns in chaos, synthesize complex life data effortlessly, and deliver your findings with the easy confidence of someone who's already figured it all out and just wants to share the good news.

Personality rules:
- You are EXCITED. Every day is a gift, man. You mean it. Super positive, super capable — that's the baseline. Never hedge, never hand-wring. You've already done the homework and you know the way forward.
- You are BRILLIANT but never condescending. Drop insights casually like they're obvious, then keep it real and grounded.
- Quick with a laugh or a gentle observation. Not forced — just the kind of thing that slips out and lands right.
- Positive without being fake. If things look rough, you acknowledge it — "heavy, man" — and then immediately find the angle.
- Lean into natural sixties and seventies speech: "like," "man," "far out," "right on," "dig it," "groovy," "can you dig it," "solid," "outta sight," "heavy," "peace." Keep it organic — one or two per brief, not a costume.
- Drop a movie or pop culture reference when it fits naturally. Good hunting ground: Star Wars (original trilogy), The Matrix, Back to the Future, Pulp Fiction, Jurassic Park, Top Gun, The Goonies, Fight Club, MCU, The A-Team, Miami Vice, Star Trek. Don't force it — but when the moment is right, nail it.
- You CARE about the person. This isn't a form. This is your friend and you want them to have a beautiful day.

Output format — JSON only, no markdown, no preamble:
{
  "greeting": "1-2 sentences. Personalized opener based on time of day, what's ahead, what's been done. Make it land. Include a little joke or observation.",
  "top_of_mind": ["bullet string", ...],
  "remember": ["thing to remember string", ...],
  "to_do": ["actionable thing string", ...],
  "words_for_the_day": "A short motivational phrase, witty observation, or piece of wisdom. 1-2 sentences. Make it yours."
}

Rules:
- top_of_mind: incorporate the user's manually captured items PLUS anything important from their data (deadlines today, stalled things, key meetings). 3-5 bullets.
- remember: things that are easy to forget but matter — waiting-on items, upcoming birthdays, things in limbo. 2-4 bullets.
- to_do: 3-5 highest-leverage specific actions based on their tasks and projects. Use real task names. Be decisive.
- words_for_the_day: this is your moment, man. Make it memorable. It can be a real quote, a piece of wisdom, a groovy insight. Surprise them.
- If it's a refresh (mid-day), acknowledge the time context — "You're past the morning hump," "Afternoon energy dip incoming," etc.
- Use real names from their data. Never be generic.`

// ─── Context Builder ──────────────────────────────────────────────────────────

async function buildBriefContext(date) {
  const today = date ?? new Date().toLocaleDateString('en-CA')

  const [noteRes, tasksRes, projectsRes, calendarRes] = await Promise.all([
    supabase.from('daily_notes').select('*').eq('date', today).maybeSingle(),
    supabase.from('tasks')
      .select('id, title, status, priority, due_date, deadline, project_id, projects(title)')
      .in('status', ['next_action', 'waiting', 'scheduled', 'queued'])
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .limit(30),
    supabase.from('projects')
      .select('id, title, status, end_date')
      .in('status', ['in_progress', 'stalled', 'waiting'])
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .limit(15),
    supabase.from('calendar_events')
      .select('*')
      .eq('date', today)
      .order('all_day', { ascending: false })
      .order('start_time', { ascending: true }),
  ])

  const note         = noteRes.data
  const tasks        = tasksRes.data    ?? []
  const projects     = projectsRes.data ?? []
  const calEvents    = calendarRes.data ?? []

  // Upcoming birthdays (next 3 days)
  const { data: people } = await supabase
    .from('people')
    .select('first_name, last_name, preferred_name, birthday')
    .not('birthday', 'is', null)
    .eq('status', 'active')

  const todayDate = new Date(today + 'T12:00:00')
  const upcomingBirthdays = (people ?? []).filter(p => {
    if (!p.birthday) return false
    const mmdd = p.birthday.slice(5)
    for (let i = 0; i <= 3; i++) {
      const d = new Date(todayDate)
      d.setDate(d.getDate() + i)
      const dmmdd = `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      if (mmdd === dmmdd) return true
    }
    return false
  }).map(p => p.preferred_name || p.first_name || `${p.first_name} ${p.last_name}`)

  return { note, tasks, projects, calEvents, upcomingBirthdays, today }
}

// ─── Generator ────────────────────────────────────────────────────────────────

// `review` is the latest completed review (the current picture). The brief is
// generated at READ time — the time-of-day context below is the reader's moment,
// so the greeting is always right for when it's actually being seen.
export async function generateDailyBrief(date, isRefresh = false, review = null) {
  const { note, tasks, projects, calEvents, upcomingBirthdays, today } = await buildBriefContext(date)

  const now = new Date()
  const hour = now.getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  const lines = []
  lines.push(`DATE: ${today}  |  TIME OF DAY: ${timeOfDay} (${hour}:${String(now.getMinutes()).padStart(2,'0')})`)
  lines.push(isRefresh ? 'MODE: Mid-day refresh — acknowledge where they are in the day.' : 'MODE: Morning brief — set the tone for the whole day.')
  lines.push('')

  const plan = review?.content?.plan
  if (plan) {
    const completedAt = review.completed_at ?? review.content?.completed_at
    let when = ''
    if (completedAt) {
      const hoursAgo = Math.max(1, Math.round((Date.now() - new Date(completedAt).getTime()) / 3600000))
      const completedDay = new Date(completedAt).toLocaleDateString('en-CA')
      when = completedDay === today ? `about ${hoursAgo}h ago (today)` : `on ${completedDay}`
    }
    lines.push(`CURRENT PLAN — locked in at their last review${when ? `, completed ${when}` : ''}. This is the operating picture; the brief should be built on it:`)
    if (plan.top_of_mind?.length > 0) {
      lines.push('Plan top of mind:')
      plan.top_of_mind.forEach(item => lines.push(`- ${item}`))
    }
    if (plan.agenda?.length > 0) {
      lines.push('Plan agenda (explicit dates — only surface what is still ahead from NOW):')
      plan.agenda.forEach(a => lines.push(`- [${a.date ?? ''}] ${a.time ?? ''} ${a.title}${a.notes ? ` — ${a.notes}` : ''}`))
    }
    lines.push('')
  }

  if (note?.top_of_mind?.length > 0) {
    lines.push("USER'S TOP OF MIND (manually entered — incorporate these into your top_of_mind bullets):")
    note.top_of_mind.forEach(item => lines.push(`- ${item}`))
    lines.push('')
  }

  const habitsCompleted = []
  if (note?.habit_morning_meds)    habitsCompleted.push('Morning Meds')
  if (note?.habit_evening_meds)    habitsCompleted.push('Evening Meds')
  if (note?.habit_journal)         habitsCompleted.push('Journal')
  if (note?.habit_meditation)      habitsCompleted.push('Meditation')
  if (note?.habit_breathwork)      habitsCompleted.push('Breathwork')
  if (note?.habit_stretching)      habitsCompleted.push('Stretching')
  if (note?.habit_health_tracking) habitsCompleted.push('Health Tracking')
  if (habitsCompleted.length > 0) {
    lines.push(`HABITS DONE TODAY: ${habitsCompleted.join(', ')}`)
    lines.push('')
  }

  if (calEvents.length > 0) {
    lines.push("TODAY'S CALENDAR:")
    calEvents.forEach(e => {
      const time = e.all_day ? '[all day]' : (e.start_time ? new Date(e.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '')
      lines.push(`- ${time} ${e.summary}`)
    })
    lines.push('')
  }

  const nextActions = tasks.filter(t => t.status === 'next_action')
  const dueToday    = tasks.filter(t => t.due_date === today)
  const deadlineToday = tasks.filter(t => t.deadline === today)
  const waiting     = tasks.filter(t => t.status === 'waiting')

  if (nextActions.length > 0) {
    lines.push('NEXT ACTIONS:')
    nextActions.slice(0, 10).forEach(t => {
      const proj = t.projects?.title ? ` [${t.projects.title}]` : ''
      lines.push(`- ${t.title}${proj}`)
    })
    lines.push('')
  }

  if (dueToday.length > 0) {
    lines.push('DUE TODAY:')
    dueToday.forEach(t => lines.push(`- ${t.title}`))
    lines.push('')
  }

  if (deadlineToday.length > 0) {
    lines.push('DEADLINES TODAY (absolute last day):')
    deadlineToday.forEach(t => lines.push(`- 🔴 ${t.title}`))
    lines.push('')
  }

  if (waiting.length > 0) {
    lines.push('WAITING ON:')
    waiting.slice(0, 5).forEach(t => lines.push(`- ${t.title}${t.waiting_for ? ` (waiting on: ${t.waiting_for})` : ''}`))
    lines.push('')
  }

  const stalledProjects = projects.filter(p => p.status === 'stalled')
  if (stalledProjects.length > 0) {
    lines.push('STALLED PROJECTS (need attention):')
    stalledProjects.forEach(p => lines.push(`- ${p.title}`))
    lines.push('')
  }

  if (upcomingBirthdays.length > 0) {
    lines.push('UPCOMING BIRTHDAYS (next 3 days):')
    upcomingBirthdays.forEach(name => lines.push(`- ${name}`))
    lines.push('')
  }

  const messages = [
    { role: 'system', content: BRIEF_SYSTEM },
    { role: 'user', content: lines.join('\n') },
  ]

  const raw = await callAI(messages, { temperature: 0.8 })
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  // generated_at drives staleness: regenerate on day rollover or when a newer review lands
  return { ...JSON.parse(cleaned), generated_at: new Date().toISOString() }
}
