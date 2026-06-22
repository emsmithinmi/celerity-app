import { supabase } from '../supabase'

// Per-list sort + manual-order preference, persisted in Supabase so it follows
// the user across devices. `list_key` is a stable string the caller picks
// (e.g. "tasks:next_action", "daily:next_action", "project:<id>:next_action").

export async function getListPreference(listKey) {
  const { data, error } = await supabase
    .from('list_preferences')
    .select('sort_mode, manual_order')
    .eq('list_key', listKey)
    .maybeSingle()
  if (error) throw error
  return data ?? { sort_mode: 'manual', manual_order: [] }
}

export async function setListSortMode(listKey, sortMode) {
  const { error } = await supabase
    .from('list_preferences')
    .upsert({ list_key: listKey, sort_mode: sortMode, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function setListManualOrder(listKey, ids) {
  const { error } = await supabase
    .from('list_preferences')
    .upsert({ list_key: listKey, manual_order: ids, updated_at: new Date().toISOString() })
  if (error) throw error
}
