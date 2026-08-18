import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

const MAX_LIMIT = 50
const DEFAULT_LIMIT = 20

const taskSelect = [
  'id',
  'title',
  'status',
  'priority',
  'area',
  'project_id',
  'notes',
  'context',
  'duration',
  'energy_level',
  'due_date',
  'scheduled_date',
  'description',
  'projects(id, title, status)',
].join(', ')

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}

function boundedLimit(value: unknown): number {
  const parsed = Number(value ?? DEFAULT_LIMIT)
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_LIMIT
  return Math.min(parsed, MAX_LIMIT)
}

function stringParam(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function statusFilter(value: unknown): string[] | null {
  if (typeof value === 'string') return stringParam(value) ? [value.trim()] : null
  if (!Array.isArray(value)) return null

  const values = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)

  return values.length ? values : null
}

async function authenticate(req: Request) {
  const authorization = req.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return null

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } } },
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  return { supabase, user }
}

async function listTasks(supabase: ReturnType<typeof createClient>, params: Record<string, unknown>) {
  let query = supabase
    .from('tasks')
    .select(taskSelect)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(boundedLimit(params.limit))

  const statuses = statusFilter(params.status)
  const projectId = stringParam(params.project_id)
  const dueBefore = stringParam(params.due_before)
  const scheduledDate = stringParam(params.scheduled_date)

  if (statuses) query = query.in('status', statuses)
  if (projectId) query = query.eq('project_id', projectId)
  if (dueBefore) query = query.lte('due_date', dueBefore)
  if (scheduledDate) query = query.eq('scheduled_date', scheduledDate)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

async function listProjects(supabase: ReturnType<typeof createClient>, params: Record<string, unknown>) {
  let query = supabase
    .from('projects')
    .select('id, title, status, priority, area, description, start_date, end_date, is_highlight, updated_at')
    .order('updated_at', { ascending: false })
    .limit(boundedLimit(params.limit))

  const statuses = statusFilter(params.status)
  if (statuses) query = query.in('status', statuses)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

async function listWaitingTasks(supabase: ReturnType<typeof createClient>, params: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`${taskSelect}, task_people(person_id, people(id, first_name, last_name, preferred_name, relationship, company, status))`)
    .eq('status', 'waiting')
    .order('updated_at', { ascending: false })
    .limit(boundedLimit(params.limit))

  if (error) throw error
  return data ?? []
}

async function listPeople(supabase: ReturnType<typeof createClient>, params: Record<string, unknown>) {
  let query = supabase
    .from('people')
    .select('id, first_name, last_name, preferred_name, professional_title, relationship, company, status, notes')
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })
    .limit(boundedLimit(params.limit))

  const statuses = statusFilter(params.status)
  if (statuses) query = query.in('status', statuses)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

const actions = {
  list_tasks: listTasks,
  list_projects: listProjects,
  list_waiting_tasks: listWaitingTasks,
  list_people: listPeople,
} as const

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405)
  }

  const auth = await authenticate(req)
  if (!auth) return json({ error: 'unauthorized' }, 401)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const action = stringParam(body.action) as keyof typeof actions | null
  if (!action || !(action in actions)) {
    return json({
      error: 'unsupported_action',
      allowed_actions: Object.keys(actions),
    }, 400)
  }

  const params = body.params && typeof body.params === 'object' && !Array.isArray(body.params)
    ? body.params as Record<string, unknown>
    : {}

  try {
    const data = await actions[action](auth.supabase, params)
    return json({ ok: true, action, data })
  } catch (error) {
    console.error('focus-flow-agent query failed', { action, error })
    return json({ error: 'query_failed' }, 500)
  }
})
