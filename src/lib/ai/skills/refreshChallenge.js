import { supabase } from '../../supabase'
import { callAI } from '../client'
import { updateChallenge } from '../../api/daily'

export async function refreshChallenge(noteId) {
  // Fetch the most recent completed challenge so we can keep progression context
  const { data: recentNotes } = await supabase
    .from('daily_notes')
    .select('date, code_challenge')
    .not('code_challenge', 'is', null)
    .order('date', { ascending: false })
    .limit(10)

  const lastCompleted = (recentNotes ?? []).find(n => n.code_challenge?.completed === true)

  let contextLines = []
  if (lastCompleted) {
    const c = lastCompleted.code_challenge
    contextLines = [
      `LAST COMPLETED CHALLENGE (${lastCompleted.date}):`,
      `Topic: ${c.topic} | Difficulty: ${c.difficulty}`,
      `Prompt: ${c.prompt}`,
      c.user_response ? `Their answer: ${c.user_response.slice(0, 400)}` : '',
      'Generate a DIFFERENT challenge — same level or one step harder. Do not repeat the prompt.',
    ]
  } else {
    contextLines = ['No completed challenge exists yet. Generate a fresh beginner-friendly challenge.']
  }

  const prompt = `Generate a single coding/AI challenge for today. The user requested a refresh — give them something different.

${contextLines.join('\n')}

Respond with valid JSON only:
{
  "topic": "python|ai|llm|general",
  "difficulty": "beginner|intermediate|advanced",
  "prompt": "string",
  "hint": "string"
}`

  const raw = await callAI([{ role: 'user', content: prompt }])
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(cleaned)

  const challenge = {
    topic: parsed.topic ?? 'general',
    difficulty: parsed.difficulty ?? 'beginner',
    prompt: parsed.prompt,
    hint: parsed.hint ?? null,
    completed: false,
    user_response: null,
  }

  await updateChallenge(noteId, challenge)
  return challenge
}
