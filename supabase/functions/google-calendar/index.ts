// Google Calendar edge function
// Fetches events from all connected Google accounts.
// - Personal account: pulls from the Focus Flow calendar
// - Additional accounts (work, etc.): pulls from their primary calendar
// Automatically refreshes access tokens when expired.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FOCUS_FLOW_CALENDAR_ID = '858f646b41576c785a734cbe4e63df27da29487b4b59ce8f1ed435e9cd7f3d7a@group.calendar.google.com'
const GOOGLE_CLIENT_ID       = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET   = Deno.env.get('GOOGLE_CLIENT_SECRET')!

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

interface CalendarEvent {
  event_id:   string | null
  summary:    unknown
  all_day:    boolean
  start_time: string | null
  end_time:   string | null
  date:       string
  notes:      string | null
  calendar_name?: string  // which account the event came from
}

async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string,
  dateStr: string,
  endDateStr?: string,
  timeMinOverride?: string,
  timeMaxOverride?: string,
  calendarName?: string,
): Promise<CalendarEvent[]> {
  const timeMin = timeMinOverride ?? `${dateStr}T00:00:00Z`
  const timeMax = timeMaxOverride ?? `${endDateStr ?? dateStr}T23:59:59Z`

  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
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
      event_id:      item.id as string ?? null,
      summary:       item.summary ?? '(No title)',
      all_day:       allDay,
      start_time:    start?.dateTime ?? start?.date ?? null,
      end_time:      end?.dateTime   ?? end?.date   ?? null,
      date:          start?.date ?? start?.dateTime?.split('T')[0] ?? dateStr,
      notes:         (item.description as string | undefined) ?? null,
      calendar_name: calendarName,
    }
  })
}

async function fetchEventsForIntegration(
  serviceClient: ReturnType<typeof createClient>,
  integration: { access_token: string; refresh_token: string | null; email: string; label: string; user_id: string },
  dateStr: string,
  endDateStr?: string,
  timeMinOverride?: string,
  timeMaxOverride?: string,
): Promise<CalendarEvent[]> {
  // Personal account → Focus Flow calendar. All others → primary calendar.
  const calendarId   = integration.label === 'personal' ? FOCUS_FLOW_CALENDAR_ID : 'primary'
  const calendarName = integration.label === 'personal' ? 'Focus Flow' : integration.email

  let accessToken = integration.access_token

  try {
    return await fetchCalendarEvents(accessToken, calendarId, dateStr, endDateStr, timeMinOverride, timeMaxOverride, calendarName)
  } catch (err) {
    // Token expired — refresh and retry
    if (String(err).includes('401') && integration.refresh_token) {
      const newToken = await refreshAccessToken(integration.refresh_token)
      if (!newToken) {
        console.warn(`Token refresh failed for ${integration.email}`)
        return []
      }

      await serviceClient
        .from('user_integrations')
        .update({ access_token: newToken, updated_at: new Date().toISOString() })
        .eq('user_id', integration.user_id)
        .eq('provider', 'google')
        .eq('email', integration.email)

      return await fetchCalendarEvents(newToken, calendarId, dateStr, endDateStr, timeMinOverride, timeMaxOverride, calendarName)
    }

    console.warn(`Calendar fetch failed for ${integration.email}:`, err)
    return []
  }
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

    const { date, endDate, timeMin: timeMinOverride, timeMax: timeMaxOverride } = await req.json().catch(() => ({}))
    const targetDate = date ?? (() => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow.toISOString().split('T')[0]
    })()

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch ALL connected Google integrations for this user
    const { data: integrations } = await serviceClient
      .from('user_integrations')
      .select('access_token, refresh_token, email, label')
      .eq('user_id', user.id)
      .eq('provider', 'google')

    if (!integrations || integrations.length === 0) {
      return new Response(JSON.stringify({ events: [], error: 'no_integration' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Fetch from all accounts in parallel
    const allEventArrays = await Promise.all(
      integrations.map(integration =>
        fetchEventsForIntegration(
          serviceClient,
          { ...integration, user_id: user.id },
          targetDate,
          endDate,
          timeMinOverride,
          timeMaxOverride,
        )
      )
    )

    // Merge and sort by start time
    const events = allEventArrays
      .flat()
      .sort((a, b) => {
        const aTime = a.start_time ?? a.date
        const bTime = b.start_time ?? b.date
        return aTime.localeCompare(bTime)
      })

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
