// Google Calendar edge function
// Fetches events from the user's Focus Flow calendar using stored OAuth tokens.
// Automatically refreshes the access token if expired.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FOCUS_FLOW_CALENDAR_ID = '858f646b41576c785a734cbe4e63df27da29487b4b59ce8f1ed435e9cd7f3d7a@group.calendar.google.com'
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

async function fetchCalendarEvents(accessToken: string, dateStr: string, endDateStr?: string) {
  // Support single-day or date-range queries
  const timeMin = `${dateStr}T00:00:00Z`
  const timeMax = `${endDateStr ?? dateStr}T23:59:59Z`

  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(FOCUS_FLOW_CALENDAR_ID)}/events`)
  url.searchParams.set('timeMin', timeMin)
  url.searchParams.set('timeMax', timeMax)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '50')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Calendar API error (${res.status}): ${err}`)
  }

  const json = await res.json()
  return (json.items ?? []).map((item: Record<string, unknown>) => {
    const start = item.start as Record<string, string> | undefined
    const end   = item.end   as Record<string, string> | undefined
    const allDay = Boolean(start?.date && !start?.dateTime)
    return {
      summary:    item.summary ?? '(No title)',
      all_day:    allDay,
      start_time: start?.dateTime ?? start?.date ?? null,
      end_time:   end?.dateTime   ?? end?.date   ?? null,
      date:       start?.date ?? start?.dateTime?.split('T')[0] ?? dateStr,
      notes:      (item.description as string | undefined) ?? null,
    }
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Authenticate the user via their Supabase JWT
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

    // Get the date range to fetch (defaults to tomorrow only)
    const { date, endDate } = await req.json().catch(() => ({}))
    const targetDate = date ?? (() => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow.toISOString().split('T')[0]
    })()

    // Look up stored Google tokens
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
      return new Response(JSON.stringify({ events: [], error: 'no_integration' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    let accessToken = integration.access_token

    // Try fetching — if 401, refresh the token and retry
    let events
    try {
      events = await fetchCalendarEvents(accessToken, targetDate, endDate)
    } catch (err) {
      if (String(err).includes('401') && integration.refresh_token) {
        const newToken = await refreshAccessToken(integration.refresh_token)
        if (!newToken) throw new Error('Token refresh failed')

        // Save the new access token
        await serviceClient
          .from('user_integrations')
          .update({ access_token: newToken, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('provider', 'google')

        events = await fetchCalendarEvents(newToken, targetDate, endDate)
      } else {
        throw err
      }
    }

    return new Response(JSON.stringify({ events }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  } catch (err) {
    console.error('google-calendar error:', err)
    return new Response(JSON.stringify({ error: String(err), events: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
