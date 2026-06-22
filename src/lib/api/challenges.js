import { supabase } from '../supabase'

// ─── Code Challenge Bank ──────────────────────────────────────────────────────
// A consumable pool of small coding challenges (see the `code_challenges` table).
// The Daily page pins one to the day; completing it deletes the row (one and
// done); skipping leaves it in the bank for another day. When the bank empties,
// run the `refresh-challenges` skill to load 25 more.

// Remaining challenges in the bank (id + content). Small table — fetch it all
// and pick client-side so "skip" can avoid repeating the current one.
export async function getChallengeBank() {
  const { data, error } = await supabase
    .from('code_challenges')
    .select('id, prompt, answer, difficulty')
  if (error) throw error
  return data ?? []
}

export async function getChallengeCount() {
  const { count, error } = await supabase
    .from('code_challenges')
    .select('id', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

// Pick a random challenge from the bank, optionally excluding one id (for skip).
export async function pickRandomChallenge(excludeId = null) {
  const bank = await getChallengeBank()
  const pool = excludeId ? bank.filter(c => c.id !== excludeId) : bank
  const choices = pool.length > 0 ? pool : bank // fall back to the last one if it's all that's left
  if (choices.length === 0) return null
  return choices[Math.floor(Math.random() * choices.length)]
}

// Remove a challenge from the bank (called on completion — one and done).
export async function deleteChallenge(id) {
  const { error } = await supabase.from('code_challenges').delete().eq('id', id)
  if (error) throw error
}
