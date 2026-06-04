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

    const { data: integration } = await serviceClient
      .from('user_integrations')
      .select('access_token, refresh_token')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .maybeSingle()

    if (!integration) {
      return new Response(JSON.stringify({ actionThreads: [], waitingThreads: [], recentUnread: [], error: 'no_integration' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    let accessToken = integration.access_token
    let result

    try {
      result = await fetchGmailContext(accessToken)
    } catch (err) {
      if (String(err).includes('401') && integration.refresh_token) {
        const newToken = await refreshAccessToken(integration.refresh_token)
        if (!newToken) throw new Error('Token refresh failed')

        await serviceClient
          .from('user_integrations')
          .update({ access_token: newToken, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('provider', 'google')

        accessToken = newToken
        result = await fetchGmailContext(accessToken)
      } else {
        throw err
      }
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
