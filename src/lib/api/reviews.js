import { supabase } from '../supabase'

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getReviews(type, limit = 10) {
  let query = supabase
    .from('reviews')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit)

  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getReviewByDate(type, date) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('type', type)
    .eq('date', date)
    .maybeSingle()
  if (error) throw error
  return data
}

// The current picture: most recently completed review, regardless of when.
// A review locks in the plan as of that moment; the latest one always wins.
export async function getLatestCompletedReview(type = 'daily') {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('type', type)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false, nullsFirst: false })
    .limit(1)
  if (error) throw error
  return data?.[0] ?? null
}

// Most recent draft review for `date` with a real conversation in progress —
// offered as a resume option on the landing screen so leaving mid-review
// (e.g. to open a task) doesn't lose the session.
export async function getResumableReview(type, date) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('type', type)
    .eq('date', date)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(5)
  if (error) throw error
  // Needs at least opening + one user message to be worth resuming
  return (data ?? []).find(r => (r.content?.conversation?.length ?? 0) >= 2) ?? null
}

// ─── Create / Ensure ──────────────────────────────────────────────────────────

export async function createReview(type, date) {
  const { data, error } = await supabase
    .from('reviews')
    .insert({ type, date, status: 'draft', content: {}, suggestions: [] })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function ensureReview(type, date) {
  const existing = await getReviewByDate(type, date)
  if (existing) return existing

  const { data, error } = await supabase
    .from('reviews')
    .insert({ type, date, status: 'draft', content: {}, suggestions: [] })
    .select()
    .single()

  if (error) {
    // Race condition: row was created between our read and insert — re-fetch
    const retry = await getReviewByDate(type, date)
    if (retry) return retry
    throw error
  }
  return data
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateReviewContent(id, content) {
  const { data, error } = await supabase
    .from('reviews')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function completeReview(id) {
  const { data, error } = await supabase
    .from('reviews')
    .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateReviewSummary(id, summary) {
  const { error } = await supabase
    .from('reviews')
    .update({ summary, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function updateSuggestions(id, suggestions) {
  const { data, error } = await supabase
    .from('reviews')
    .update({ suggestions, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
