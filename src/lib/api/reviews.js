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

// ─── Create / Ensure ──────────────────────────────────────────────────────────

export async function ensureReview(type, date) {
  const existing = await getReviewByDate(type, date)
  if (existing) return existing

  const { data, error } = await supabase
    .from('reviews')
    .insert({ type, date, status: 'draft', content: {}, suggestions: [] })
    .select()
    .single()
  if (error) throw error
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
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
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
