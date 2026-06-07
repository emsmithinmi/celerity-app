import { supabase } from '../supabase'

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getTasks(filters = {}) {
  let query = supabase
    .from('tasks')
    .select('*, projects(id, title), task_people(person_id, people(id, first_name, last_name))')
    .order('created_at', { ascending: false })

  if (filters.statuses) query = query.in('status', filters.statuses)
  else if (filters.status) query = query.eq('status', filters.status)
  if (filters.project_id) query = query.eq('project_id', filters.project_id)
  if (filters.priority) query = query.eq('priority', filters.priority)
  if (filters.area) query = query.eq('area', filters.area)
  if (filters.due_date) query = query.eq('due_date', filters.due_date)
  if (filters.not_status) query = query.neq('status', filters.not_status)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getTask(id) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, projects(id, title), task_people(person_id, people(id, first_name, last_name, preferred_name))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getAllContextTags() {
  const { data, error } = await supabase
    .from('tasks')
    .select('context')
    .not('context', 'is', null)
  if (error) throw error
  const all = data.flatMap(r => r.context ?? [])
  return [...new Set(all)].sort()
}

export async function getTaskComments(taskId) {
  const { data, error } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createTask({ title, project_id = null, status = 'inbox', ...rest }) {
  const insert = { title, status, ...rest }
  if (project_id) insert.project_id = project_id
  const { data, error } = await supabase
    .from('tasks')
    .insert(insert)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateTask(id, updates) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function clarifyTask(id, fields) {
  // fields: { description, priority, duration, energy_level, area }
  return updateTask(id, fields)
}

// ─── Status Transitions ───────────────────────────────────────────────────────

export async function moveToNextAction(id) {
  const task = await getTask(id)
  await updateTask(id, { status: 'next_action' })
  // If the parent project is stalled, promote it back to in_progress
  if (task.project_id) {
    const { data: project } = await supabase.from('projects').select('status').eq('id', task.project_id).single()
    if (project?.status === 'stalled') {
      await supabase.from('projects')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', task.project_id)
    }
  }
  return getTask(id)
}

export async function moveToQueued(id) {
  // Only valid for tasks with a project_id — enforced in UI
  return updateTask(id, { status: 'queued' })
}

export async function moveToWaiting(id, blockerReason) {
  const task = await getTask(id)
  await addTaskComment(id, `Moved to Waiting on ${new Date().toLocaleDateString()}. Blocker: ${blockerReason}`)

  // Cascade: move parent project to waiting
  if (task.project_id) {
    await cascadeProjectToWaiting(task.project_id)
  }

  return updateTask(id, { status: 'waiting' })
}

export async function clearWaiting(id) {
  const task = await getTask(id)
  await addTaskComment(id, `Blocker cleared on ${new Date().toLocaleDateString()}.`)
  await updateTask(id, { status: 'next_action' })

  // Cascade: check if project can come off waiting
  if (task.project_id) {
    await checkProjectWaitingClear(task.project_id)
  }

  return getTask(id)
}

export async function completeTask(id) {
  return updateTask(id, { status: 'done', completed_at: new Date().toISOString() })
}

/**
 * Full completion flow — handles comment, archive flag, and highlight flag.
 * { comment, archive, highlight, highlightNote }
 * - archive:   status = 'archived' (kept permanently)
 * - highlight: is_highlight = true + highlight_note
 * - neither:   status = 'done' + completed_at (30-day auto-delete)
 */
export async function completeTaskWithOptions(id, { comment, archive, highlight, highlightNote }) {
  const updates = { completed_at: new Date().toISOString() }

  if (archive) {
    updates.status = 'archived'
  } else {
    updates.status = 'done'
  }

  if (highlight) {
    updates.is_highlight    = true
    updates.highlighted_at  = new Date().toISOString()
    updates.highlight_note  = highlightNote ?? null
  }

  await updateTask(id, updates)

  if (comment) {
    await addTaskComment(id, comment)
  }

  return getTask(id)
}

export async function archiveTask(id) {
  return updateTask(id, { status: 'archived' })
}

export async function permanentDeleteTask(id) {
  // Hard delete — cascade handled by DB foreign keys
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

export async function cleanupExpiredDoneTasks() {
  // Delete done tasks whose 30-day window has passed. Fire-and-forget safe.
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('status', 'done')
    .not('completed_at', 'is', null)
    .lt('completed_at', cutoff.toISOString())
  if (error) console.warn('cleanupExpiredDoneTasks:', error.message)
}

export async function highlightTask(id, highlightNote) {
  return updateTask(id, {
    is_highlight: true,
    highlighted_at: new Date().toISOString(),
    highlight_note: highlightNote,
  })
}

export async function didIt(id) {
  // Hard delete — task was too small to be worth keeping
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function addTaskComment(taskId, body) {
  const { data, error } = await supabase
    .from('task_comments')
    .insert({ task_id: taskId, body })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTaskComment(commentId) {
  const { error } = await supabase.from('task_comments').delete().eq('id', commentId)
  if (error) throw error
}

// ─── People Links ─────────────────────────────────────────────────────────────

export async function linkPersonToTask(taskId, personId) {
  const { error } = await supabase
    .from('task_people')
    .insert({ task_id: taskId, person_id: personId })
  if (error) throw error
}

export async function unlinkPersonFromTask(taskId, personId) {
  const { error } = await supabase
    .from('task_people')
    .delete()
    .eq('task_id', taskId)
    .eq('person_id', personId)
  if (error) throw error
}

// ─── Project Waiting Cascade (called internally) ──────────────────────────────

async function cascadeProjectToWaiting(projectId) {
  const { data: project } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .single()

  if (project && project.status !== 'waiting') {
    await supabase
      .from('projects')
      .update({
        previous_status: project.status,
        status: 'waiting',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
  }
}

async function checkProjectWaitingClear(projectId) {
  const { data: waitingTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('project_id', projectId)
    .eq('status', 'waiting')

  if (!waitingTasks || waitingTasks.length === 0) {
    const { data: project } = await supabase
      .from('projects')
      .select('previous_status')
      .eq('id', projectId)
      .single()

    const restoreStatus = project?.previous_status || 'in_progress'

    await supabase
      .from('projects')
      .update({
        status: restoreStatus,
        previous_status: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    await supabase
      .from('project_comments')
      .insert({
        project_id: projectId,
        body: `All blockers cleared on ${new Date().toLocaleDateString()}. Project returned to ${restoreStatus}.`,
      })
  }
}
