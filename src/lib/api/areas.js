import { supabase } from '../supabase'

export async function getAreas() {
  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function createArea(attrs) {
  const { data, error } = await supabase
    .from('areas')
    .insert(attrs)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateArea(id, attrs) {
  const { data, error } = await supabase
    .from('areas')
    .update(attrs)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteArea(id) {
  const { error } = await supabase
    .from('areas')
    .delete()
    .eq('id', id)
  if (error) throw error
}
