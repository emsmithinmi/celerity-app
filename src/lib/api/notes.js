import { supabase } from '../supabase'

export async function getNote(id) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getNotes() {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createNote(body) {
  const { data, error } = await supabase
    .from('notes')
    .insert({ body })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateNote(id, body) {
  const { data, error } = await supabase
    .from('notes')
    .update({ body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateNoteContext(id, context) {
  const { data, error } = await supabase
    .from('notes')
    .update({ context, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteNote(id) {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw error
}

export async function getNotepeople(noteId) {
  const { data, error } = await supabase
    .from('note_people')
    .select('person_id, people(*)')
    .eq('note_id', noteId)
  if (error) throw error
  return data ?? []
}

export async function getPersonNotes(personId) {
  const { data, error } = await supabase
    .from('note_people')
    .select('note_id, notes(*)')
    .eq('person_id', personId)
  if (error) throw error
  return (data ?? []).map(row => row.notes)
}

export async function linkPersonToNote(noteId, personId) {
  const { error } = await supabase.from('note_people').insert({ note_id: noteId, person_id: personId })
  if (error && error.code !== '23505') throw error
}

export async function unlinkPersonFromNote(noteId, personId) {
  const { error } = await supabase.from('note_people').delete().eq('note_id', noteId).eq('person_id', personId)
  if (error) throw error
}
