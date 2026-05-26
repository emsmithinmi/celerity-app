import { supabase } from '../supabase'

export async function getPriorities() {
  const { data, error } = await supabase
    .from('priorities')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function createPriority(attrs) {
  const { data, error } = await supabase
    .from('priorities')
    .insert(attrs)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePriority(id, attrs) {
  const { data, error } = await supabase
    .from('priorities')
    .update(attrs)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePriority(id) {
  const { error } = await supabase
    .from('priorities')
    .delete()
    .eq('id', id)
  if (error) throw error
}
