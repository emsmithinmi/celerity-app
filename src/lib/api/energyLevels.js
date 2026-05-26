import { supabase } from '../supabase'

export async function getEnergyLevels() {
  const { data, error } = await supabase
    .from('energy_levels')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function createEnergyLevel(attrs) {
  const { data, error } = await supabase
    .from('energy_levels')
    .insert(attrs)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEnergyLevel(id, attrs) {
  const { data, error } = await supabase
    .from('energy_levels')
    .update(attrs)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEnergyLevel(id) {
  const { error } = await supabase
    .from('energy_levels')
    .delete()
    .eq('id', id)
  if (error) throw error
}
