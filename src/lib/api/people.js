import { supabase } from '../supabase'

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getPeople(filters = {}) {
  let query = supabase
    .from('people')
    .select('*')
    .order('last_name', { ascending: true })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.contact_type) query = query.eq('contact_type', filters.contact_type)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getPerson(id) {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getPersonComments(personId) {
  const { data, error } = await supabase
    .from('people_comments')
    .select('*')
    .eq('person_id', personId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function getPersonTasks(personId) {
  const { data, error } = await supabase
    .from('task_people')
    .select('tasks(*)')
    .eq('person_id', personId)
  if (error) throw error
  return data?.map(r => r.tasks) ?? []
}

export async function getPersonProjects(personId) {
  const { data, error } = await supabase
    .from('project_people')
    .select('projects(*)')
    .eq('person_id', personId)
  if (error) throw error
  return data?.map(r => r.projects) ?? []
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createPerson({ first_name, last_name, ...rest }) {
  const { data, error } = await supabase
    .from('people')
    .insert({ first_name, last_name, status: 'inbox', ...rest })
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updatePerson(id, updates) {
  const { data, error } = await supabase
    .from('people')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function activatePerson(id) {
  return updatePerson(id, { status: 'active' })
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function addPersonComment(personId, body) {
  const { data, error } = await supabase
    .from('people_comments')
    .insert({ person_id: personId, body })
    .select()
    .single()
  if (error) throw error
  return data
}
