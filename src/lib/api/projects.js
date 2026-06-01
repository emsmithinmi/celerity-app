import { supabase } from '../supabase'
import { addTaskComment } from './tasks'

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getProjects(filters = {}) {
  let query = supabase
    .from('projects')
    .select('*, project_people(person_id, people(id, first_name, last_name))')
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.area) query = query.eq('area', filters.area)
  if (filters.end_date) query = query.eq('end_date', filters.end_date)
  if (filters.start_date) query = query.eq('start_date', filters.start_date)
  if (filters.archived === false) query = query.is('archived_at', null)
  if (filters.archived === true) query = query.not('archived_at', 'is', null)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getProject(id) {
  const { data, error } = await supabase
    .from('projects')
    .select('*, project_people(person_id, people(id, first_name, last_name, preferred_name))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getProjectTasks(projectId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getProjectComments(projectId) {
  const { data, error } = await supabase
    .from('project_comments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createProject({ title }) {
  const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const { data, error } = await supabase
    .from('projects')
    .insert({ title, slug, status: 'inbox' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateProject(id, updates) {
  const { data, error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Status Transitions ───────────────────────────────────────────────────────

export async function startPlanning(id) {
  // Requires: title, area, description, start_date, end_date — validated in UI
  return updateProject(id, { status: 'planning' })
}

export async function startProject(id) {
  // Requires: at least 2 tasks assigned — validated in UI
  return updateProject(id, { status: 'in_progress' })
}

export async function completeProject(id) {
  // 1. Auto-complete all unfinished tasks
  const { data: openTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('project_id', id)
    .neq('status', 'done')

  if (openTasks?.length) {
    for (const task of openTasks) {
      await supabase
        .from('tasks')
        .update({ status: 'done', updated_at: new Date().toISOString() })
        .eq('id', task.id)
      await addTaskComment(task.id, 'Task autocompleted on Project completion.')
    }
  }

  // 2. Mark project complete
  return updateProject(id, { status: 'completed' })
}

export async function archiveProject(id) {
  return updateProject(id, { archived_at: new Date().toISOString() })
}

export async function scrapeProject(id) {
  // 1. Collect task IDs belonging to this project
  const { data: projectTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('project_id', id)

  if (projectTasks?.length) {
    const taskIds = projectTasks.map(t => t.id)

    // 2. Delete task_people links for those tasks
    await supabase.from('task_people').delete().in('task_id', taskIds)

    // 3. Delete task comments for those tasks
    await supabase.from('task_comments').delete().in('task_id', taskIds)

    // 4. Delete the tasks themselves
    await supabase.from('tasks').delete().in('id', taskIds)
  }

  // 5. Delete project_people links
  await supabase.from('project_people').delete().eq('project_id', id)

  // 6. Delete project comments
  await supabase.from('project_comments').delete().eq('project_id', id)

  // 7. Delete the project
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}

export async function highlightProject(id, highlightNote) {
  return updateProject(id, {
    is_highlight: true,
    highlighted_at: new Date().toISOString(),
    highlight_note: highlightNote,
  })
}

// ─── Stalled Check (call after any task status change) ───────────────────────

export async function checkProjectStalled(projectId) {
  const { data: activeTasks } = await supabase
    .from('tasks')
    .select('id, status')
    .eq('project_id', projectId)
    .in('status', ['next_action', 'waiting'])

  const { data: project } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .single()

  if (!project || ['completed', 'inbox', 'planning'].includes(project.status)) return

  if (!activeTasks || activeTasks.length === 0) {
    if (project.status !== 'stalled') {
      await updateProject(projectId, { status: 'stalled' })
    }
  } else if (project.status === 'stalled') {
    await updateProject(projectId, { status: 'in_progress' })
  }
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function addProjectComment(projectId, body) {
  const { data, error } = await supabase
    .from('project_comments')
    .insert({ project_id: projectId, body })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProjectComment(commentId) {
  const { error } = await supabase.from('project_comments').delete().eq('id', commentId)
  if (error) throw error
}

// ─── People Links ─────────────────────────────────────────────────────────────

export async function linkPersonToProject(projectId, personId) {
  const { error } = await supabase
    .from('project_people')
    .insert({ project_id: projectId, person_id: personId })
  if (error) throw error
}

export async function unlinkPersonFromProject(projectId, personId) {
  const { error } = await supabase
    .from('project_people')
    .delete()
    .eq('project_id', projectId)
    .eq('person_id', personId)
  if (error) throw error
}
