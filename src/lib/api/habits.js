import { supabase } from '../supabase'

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function getHabits() {
  const { data, error } = await supabase
    .from('habits')
    .select('id, key, label, target_days, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createHabit(label, targetDays = 7) {
  const key = 'habit_' + label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').replace(/_+/g, '_').replace(/^_|_$/g, '')
  const { data: last } = await supabase.from('habits').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const sortOrder = (last?.sort_order ?? -1) + 1
  const { data, error } = await supabase
    .from('habits')
    .insert({ key, label, target_days: targetDays, sort_order: sortOrder, is_active: true })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateHabit(id, changes) {
  const { data, error } = await supabase
    .from('habits')
    .update(changes)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteHabit(id) {
  const { error } = await supabase.from('habits').delete().eq('id', id)
  if (error) throw error
}

export async function getHabitHistory(since) {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('habit_history')
    .select('date, entries')
    .eq('user_id', userId)
    .gte('date', since)
    .order('date', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function setHabitEntry(date, habitKey, value) {
  const userId = await getUserId()
  const { data: existing } = await supabase
    .from('habit_history')
    .select('id, entries')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()

  const entries = { ...(existing?.entries ?? {}), [habitKey]: value }

  if (existing) {
    const { data, error } = await supabase
      .from('habit_history')
      .update({ entries, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('date, entries')
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('habit_history')
      .insert({ user_id: userId, date, entries })
      .select('date, entries')
      .single()
    if (error) throw error
    return data
  }
}
