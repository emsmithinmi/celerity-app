import { supabase } from '../supabase'

export async function getContextTags() {
  const { data, error } = await supabase
    .from('context_tags')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function createContextTag(attrs) {
  const { data, error } = await supabase
    .from('context_tags')
    .insert(attrs)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateContextTag(id, attrs) {
  const { data, error } = await supabase
    .from('context_tags')
    .update(attrs)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteContextTag(id) {
  const { error } = await supabase
    .from('context_tags')
    .delete()
    .eq('id', id)
  if (error) throw error
}
