// Google Calendar edge function
// Fetches events from all connected Google accounts.
// - Personal account: pulls from the Focus Flow + Work Hours calendars
// - Additional accounts (work, etc.): pulls from their primary calendar
// Automatically refreshes access tokens when expired.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FOCUS_FLOW_CALENDAR_ID = '858f646b41576c785a734cbe4e63df27da29487b4b59ce8f1ed435e9cd7f3d7a@group.calendar.google.com'
const WORK_HOURS_CALENDAR_ID = 'b940ae44f30d11a5c110374086e4884b77a70a1c4bf1845f05021281bbe54252@group.calendar.google.com'
const GOOGLE_CLIENT_ID       = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET   = Deno.env.get('GOOGLE_CLIENT_SECRET')!

// Calendars fetched for the 'personal' integration — each surfaces as its own
// toggleable entry in the Main Dashboard Agenda legend.
const PERSONAL_CALENDARS = [
  { id: FOCUS_FLOW_CALENDAR_ID, name: 'Focus Flow' },
  { id: WORK_HOURS_CALENDAR_ID, name: 'Work Hours' },
]

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

interface IntegrationResult {
  email: string
  label: string
  eventCount: number
  error: string | null
  auth_required: boolean
  events: CalendarEvent[]
}

// Personal account → Focus Flow + Work Hours calendars (each tagged separately
// so they show as distinct toggleable entries). All others → primary calendar.
async function fetchCalendarsForIntegration(
  accessToken: string,
  integration: { email: string; label: string },
  dateStr: string,
  endDateStr?: string,
  timeMinOverride?: string,
  timeMaxOverride?: string,
): Promise<CalendarEvent[]> {
  if (integration.label === 'personal') {
    const results = await Promise.all(
      PERSONAL_CALENDARS.map(cal =>
        fetchCalendarEvents(accessToken, cal.id, dateStr, endDateStr, timeMinOverride, timeMaxOverride, cal.name)
      )
    )
    return results.flat()
  }
  return fetchCalendarEvents(accessToken, 'primary', dateStr, endDateStr, timeMinOverride, timeMaxOverride, integration.email)
}

async function fetchEventsForIntegration(
  serviceClient: ReturnType<typeof createClient>,
  integration: { access_token: string; refresh_token: string | null; email: string; label: string; user_id: string },
  dateStr: string,
  endDateStr?: string,
  timeMinOverride?: string,
  timeMaxOverride?: string,
): Promise<IntegrationResult> {
  const base = { email: integration.email, label: integration.label }

  try {
    const events = await fetchCalendarsForIntegration(integration.access_token, integration, dateStr, endDateStr, timeMinOverride, timeMaxOverride)
    return { ...base, events, eventCount: events.length, error: null, auth_required: false }
  } catch (err) {
    const errStr = String(err)
    const isAuthError = errStr.includes('401') || errStr.includes('invalid_token')

    // Token likely expired — try refresh
    if (isAuthError && integration.refresh_token) {
      const newToken = await refreshAccessToken(integration.refresh_token)
      if (!newToken) {
        // Refresh failed — token was revoked. User must reconnect Google.
        console.warn(`Token refresh failed for ${integration.email} — refresh token revoked or invalid`)
        return { ...base, events: [], eventCount: 0, error: 'refresh_failed', auth_required: true }
      }

      await serviceClient
        .from('user_integrations')
        .update({ access_token: newToken, updated_at: new Date().toISOString() })
        .eq('user_id', integration.user_id)
        .eq('provider', 'google')
        .eq('email', integration.email)

      try {
        const events = await fetchCalendarsForIntegration(newToken, integration, dateStr, endDateStr, timeMinOverride, timeMaxOverride)
        return { ...base, events, eventCount: events.length, error: null, auth_required: false }
      } catch (retryErr) {
        console.warn(`Calendar fetch failed after refresh for ${integration.email}:`, retryErr)
        return { ...base, events: [], eventCount: 0, error: String(retryErr), auth_required: false }
      }
    }

    console.warn(`Calendar fetch failed for ${integration.email}:`, err)
    return { ...base, events: [], eventCount: 0, error: errStr, auth_required: false }
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
    const results = await Promise.all(
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
    const events = results
      .flatMap(r => r.events)
      .sort((a, b) => {
        const aTime = a.start_time ?? a.date
        const bTime = b.start_time ?? b.date
        return aTime.localeCompare(bTime)
      })

    // Per-integration status — UI uses `auth_required` to prompt reconnect
    const integrationStatus = results.map(({ events: _events, ...rest }) => rest)
    const auth_required = results.some(r => r.auth_required)

    return new Response(JSON.stringify({ events, integrations: integrationStatus, auth_required }), {
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
