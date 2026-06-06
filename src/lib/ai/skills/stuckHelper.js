import { supabase } from '../../supabase'
import { callAI } from '../client'

/**
 * Fetch next-action tasks and ask the AI (or fall back to heuristics)
 * to pick 3-5 easy wins to break through a stuck moment.
 *
 * Returns: { opening: string, suggestions: [{ task_id, title, reason }] }
 */
export async function getStuckSuggestions(aiConfigured = false) {
  // Fetch next actions — grab enough context to let AI choose well
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, duration, energy_level, description, priority, due_date, deadline')
    .eq('status', 'next_action')
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(40)

  if (error || !tasks?.length) {
    return {
      opening: "Your next actions list is clear — nothing to pick from. Maybe capture something first?",
      suggestions: [],
    }
  }

  if (aiConfigured) {
    return getAISuggestions(tasks)
  }

  return getHeuristicSuggestions(tasks)
}

// ─── AI path ─────────────────────────────────────────────────────────────────

const STUCK_SYSTEM = `You are the AI sidekick inside Focus Flow. The user just said they're stuck or overwhelmed and need help getting moving.

Your job: scan their next actions and pick 3-5 tasks that would be the easiest, lowest-friction way to get started. Think "what could they knock out in the next 30 minutes to build momentum?"

Prioritize:
- Short duration (≤ 30 min)
- Low energy requirement
- Concrete and specific (not vague)
- No hard blockers or dependencies obvious from the title

Avoid:
- Long, complex tasks
- Anything that requires high cognitive load to start
- Vague tasks like "research X" with no constraints

Respond with valid JSON only:
{
  "opening": "1-2 sentence warm encouragement + what you found",
  "suggestions": [
    { "task_id": "uuid", "title": "task title", "reason": "8-15 word reason why this is a good starter" }
  ]
}`

async function getAISuggestions(tasks) {
  const lines = ['NEXT ACTIONS:']
  tasks.forEach(t => {
    const parts = [`[id:${t.id}] ${t.title}`]
    if (t.duration)     parts.push(`${t.duration}min`)
    if (t.energy_level) parts.push(`energy:${t.energy_level}`)
    if (t.due_date)     parts.push(`due:${t.due_date}`)
    if (t.deadline)     parts.push(`deadline:${t.deadline}`)
    lines.push('- ' + parts.join(' | '))
  })

  const messages = [
    { role: 'system', content: STUCK_SYSTEM },
    { role: 'user',   content: lines.join('\n') },
  ]

  try {
    const raw     = await callAI(messages, { temperature: 0.6 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed  = JSON.parse(cleaned)

    // Hydrate titles from the local task list in case AI omitted them
    const taskMap = Object.fromEntries(tasks.map(t => [t.id, t]))
    const suggestions = (parsed.suggestions ?? []).map(s => ({
      task_id: s.task_id,
      title:   s.title ?? taskMap[s.task_id]?.title ?? '(unknown)',
      reason:  s.reason,
    }))

    return { opening: parsed.opening ?? "Here are some easy wins:", suggestions }
  } catch {
    return getHeuristicSuggestions(tasks)
  }
}

// ─── Heuristic fallback ───────────────────────────────────────────────────────

const ENERGY_SCORE = { low: 1, medium: 2, high: 3, critical: 4 }

function getHeuristicSuggestions(tasks) {
  const scored = tasks.map(t => {
    let score = 0
    if (t.duration && t.duration <= 15)  score += 3
    else if (t.duration && t.duration <= 30) score += 2
    else if (t.duration && t.duration <= 60) score += 1
    const e = ENERGY_SCORE[t.energy_level]
    if (e === 1) score += 3
    else if (e === 2) score += 1
    return { ...t, score }
  })

  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return {
    opening: "Set up an AI provider in Settings for smarter picks — here are your shortest, lowest-energy tasks:",
    suggestions: top.map(t => ({
      task_id: t.id,
      title:   t.title,
      reason:  t.duration ? `~${t.duration} min${t.energy_level ? `, ${t.energy_level} energy` : ''}` : (t.energy_level ? `${t.energy_level} energy` : 'quick win'),
    })),
  }
}
