import { supabase } from '../supabase'
import { updateTask, createTask } from '../api/tasks'
import { updateProject } from '../api/projects'

const ACTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-actions`

async function callGoogleAction(action) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  const res = await fetch(ACTIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(action),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Action failed (${res.status})`)
  }
}

// Executes a structured action from a review suggestion card.
// Task/project writes go directly to Supabase; Google API calls go through the edge function.
export async function executeAction(action) {
  if (!action?.type) return

  switch (action.type) {
    case 'update_task':
      await updateTask(action.task_id, action.fields)
      break
    case 'create_task':
      await createTask(action.fields)
      break
    case 'update_project':
      await updateProject(action.project_id, action.fields)
      break
    case 'archive_email':
    case 'trash_email':
    case 'create_calendar_event':
    case 'update_calendar_event':
    case 'delete_calendar_event':
      await callGoogleAction(action)
      break
    default:
      console.warn('Unknown action type:', action.type)
  }
}
