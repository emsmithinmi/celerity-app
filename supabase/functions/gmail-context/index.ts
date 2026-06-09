// Gmail context edge function
// Returns threads from @Action and @Waiting labels + notable recent unread,
// for use in the daily review AI context.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_CLIENT_ID     = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.access_token ?? null
}

interface ThreadSummary {
  id: string
  subject: string
  sender: string
  snippet: string
  date: string
  age_days: number
}

async function getLabelMap(accessToken: string): Promise<Record<string, string>> {
  const res = await fetch('https://www.googleapis.com/gmail/v1/users/me/labels', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Labels API error: ${res.status}`)
  const json = await res.json()
  const map: Record<string, string> = {}
  for (const label of json.labels ?? []) {
    map[label.name as string] = label.id as string
  }
  return map
}

function findLabel(map: Record<string, string>, keyword: string): string | null {
  // Exact match first, then partial
  for (const [name, id] of Object.entries(map)) {
    if (name === keyword) return id
  }
  for (const [name, id] of Object.entries(map)) {
    if (name.toLowerCase().includes(keyword.toLowerCase())) return id
  }
  return null
}

async function getThreadMetadata(accessToken: string, threadId: string): Promise<ThreadSummary | null> {
  const res = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) return null
  const detail = await res.json()
  const firstMsg = detail.messages?.[0]
  if (!firstMsg) return null

  const headers: Array<{ name: string; value: string }> = firstMsg.payload?.headers ?? []
  const get = (name: string) => headers.find(h => h.name === name)?.value ?? ''

  const dateStr = get('Date')
  const date = dateStr ? new Date(dateStr) : new Date()
  const ageDays = Math.floor((Date.now() - date.getTime()) / 86_400_000)

  return {
    id: threadId,
    subject: get('Subject') || '(No subject)',
    sender: get('From') || 'Unknown',
    snippet: firstMsg.snippet ?? '',
    date: date.toISOString(),
    age_days: ageDays,
  }
}

async function getThreadsForLabel(accessToken: string, labelId: string): Promise<ThreadSummary[]> {
  const url = new URL('https://www.googleapis.com/gmail/v1/users/me/threads')
  url.searchParams.set('labelIds', labelId)
  url.searchParams.set('maxResults', '15')

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) return []
  const json = await res.json()
  const threads: Array<{ id: string }> = json.threads ?? []

  const results = await Promise.all(threads.map(t => getThreadMetadata(accessToken, t.id)))
  return results.filter((t): t is ThreadSummary => t !== null)
}

async function getRecentUnread(accessToken: string): Promise<ThreadSummary[]> {
  // Recent unread, excluding the action/waiting labels to avoid duplicates
  const url = new URL('https://www.googleapis.com/gmail/v1/users/me/threads')
  url.searchParams.set('q', 'is:unread newer_than:2d -in:spam -in:trash')
  url.searchParams.set('maxResults', '12')

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) return []
  const json = await res.json()
  const threads: Array<{ id: string }> = json.threads ?? []

  const results = await Promise.all(threads.map(t => getThreadMetadata(accessToken, t.id)))
  return results.filter((t): t is ThreadSummary => t !== null)
}

async function fetchGmailContext(accessToken: string) {
  const labelMap = await getLabelMap(accessToken)

  const actionLabelId  = findLabel(labelMap, '@Action 🚨') ?? findLabel(labelMap, 'Action')
  const waitingLabelId = findLabel(labelMap, '@Waiting⌛') ?? findLabel(labelMap, 'Waiting')

  const [actionThreads, waitingThreads, recentUnread] = await Promise.all([
    actionLabelId  ? getThreadsForLabel(accessToken, actionLabelId)  : Promise.resolve([]),
    waitingLabelId ? getThreadsForLabel(accessToken, waitingLabelId) : Promise.resolve([]),
    getRecentUnread(accessToken),
  ])

  return { actionThreads, waitingThreads, recentUnread }
}

async function fetchGmailContextForIntegration(
  serviceClient: ReturnType<typeof createClient>,
  integration: { access_token: string; refresh_token: string | null; email: string; user_id: string }
): Promise<ReturnType<typeof fetchGmailContext> | null> {
  let accessToken = integration.access_token
  try {
    return await fetchGmailContext(accessToken)
  } catch (err) {
    if (String(err).includes('401') && integration.refresh_token) {
      const newToken = await refreshAccessToken(integration.refresh_token)
      if (!newToken) {
        console.warn(`Token refresh failed for ${integration.email}`)
        return null
      }
      await serviceClient
        .from('user_integrations')
        .update({ access_token: newToken, updated_at: new Date().toISOString() })
        .eq('user_id', integration.user_id)
        .eq('provider', 'google')
        .eq('email', integration.email)

      return await fetchGmailContext(newToken)
    }
    console.warn(`Gmail fetch failed for ${integration.email}:`, err)
    return null
  }
}

function dedupeThreads(threads: ThreadSummary[]): ThreadSummary[] {
  const seen = new Set<string>()
  return threads.filter(t => {
    if (seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch ALL connected Google integrations
    const { data: integrations } = await serviceClient
      .from('user_integrations')
      .select('access_token, refresh_token, email')
      .eq('user_id', user.id)
      .eq('provider', 'google')

    if (!integrations || integrations.length === 0) {
      return new Response(JSON.stringify({ actionThreads: [], waitingThreads: [], recentUnread: [], error: 'no_integration' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Fetch from all accounts in parallel
    const results = await Promise.all(
      integrations.map(integration =>
        fetchGmailContextForIntegration(serviceClient, { ...integration, user_id: user.id })
      )
    )

    // Merge results from all accounts, deduplicate by thread id
    const merged = results.reduce(
      (acc, r) => {
        if (!r) return acc
        return {
          actionThreads:  [...acc.actionThreads,  ...r.actionThreads],
          waitingThreads: [...acc.waitingThreads, ...r.waitingThreads],
          recentUnread:   [...acc.recentUnread,   ...r.recentUnread],
        }
      },
      { actionThreads: [] as ThreadSummary[], waitingThreads: [] as ThreadSummary[], recentUnread: [] as ThreadSummary[] }
    )

    const result = {
      actionThreads:  dedupeThreads(merged.actionThreads).sort((a, b) => a.date.localeCompare(b.date)),
      waitingThreads: dedupeThreads(merged.waitingThreads).sort((a, b) => a.date.localeCompare(b.date)),
      recentUnread:   dedupeThreads(merged.recentUnread).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15),
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  } catch (err) {
    console.error('gmail-context error:', err)
    return new Response(JSON.stringify({ actionThreads: [], waitingThreads: [], recentUnread: [], error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
