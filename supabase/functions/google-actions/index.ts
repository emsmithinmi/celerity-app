// Executes Gmail and Google Calendar actions on behalf of the user.
// Called when a review suggestion card with an attached action is accepted.

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

type CalendarEventInput = {
  summary: string
  start: string       // ISO 8601 datetime or date string
  end?: string
  description?: string
  all_day?: boolean
  timezone?: string   // IANA timezone name, e.g. "America/Detroit"
}

type Action =
  | { type: 'archive_email';           thread_id: string }
  | { type: 'trash_email';             thread_id: string }
  | { type: 'create_calendar_event';   event: CalendarEventInput }
  | { type: 'update_calendar_event';   event_id: string; fields: Partial<CalendarEventInput> }
  | { type: 'delete_calendar_event';   event_id: string }

function toCalendarDateTime(iso: string, allDay: boolean, tz?: string) {
  if (allDay) {
    return { date: iso.split('T')[0] }
  }
  return { dateTime: iso, timeZone: tz ?? 'UTC' }
}

async function run(accessToken: string, action: Action): Promise<string | null> {
  switch (action.type) {

    case 'archive_email': {
      const res = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/threads/${action.thread_id}/modify`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ removeLabelIds: ['INBOX'] }),
        }
      )
      if (!res.ok) throw new Error(`Gmail archive error ${res.status}: ${await res.text()}`)
      return null
    }

    case 'trash_email': {
      const res = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/threads/${action.thread_id}/trash`,
        { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (!res.ok) throw new Error(`Gmail trash error ${res.status}: ${await res.text()}`)
      return null
    }

    case 'create_calendar_event': {
      const { event } = action
      const allDay = event.all_day ?? !event.start.includes('T')
      const tz = event.timezone
      const body: Record<string, unknown> = {
        summary: event.summary,
        start:   toCalendarDateTime(event.start, allDay, tz),
        end:     toCalendarDateTime(event.end ?? event.start, allDay, tz),
      }
      if (event.description) body.description = event.description

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(FOCUS_FLOW_CALENDAR_ID)}/events`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )
      if (!res.ok) throw new Error(`Calendar create error ${res.status}: ${await res.text()}`)
      const created = await res.json()
      return (created.id as string) ?? null
    }

    case 'update_calendar_event': {
      const { event_id, fields } = action
      const allDay = fields.all_day ?? (fields.start ? !fields.start.includes('T') : false)
      const tz = fields.timezone
      const body: Record<string, unknown> = {}
      if (fields.summary)     body.summary     = fields.summary
      if (fields.description !== undefined) body.description = fields.description
      if (fields.start)       body.start       = toCalendarDateTime(fields.start, allDay, tz)
      if (fields.end)         body.end         = toCalendarDateTime(fields.end,   allDay, tz)

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(FOCUS_FLOW_CALENDAR_ID)}/events/${event_id}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )
      if (!res.ok) throw new Error(`Calendar update error ${res.status}: ${await res.text()}`)
      return event_id
    }

    case 'delete_calendar_event': {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(FOCUS_FLOW_CALENDAR_ID)}/events/${action.event_id}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
      )
      // 404 means already gone — treat as success
      if (!res.ok && res.status !== 404) throw new Error(`Calendar delete error ${res.status}: ${await res.text()}`)
      return null
    }
  }
  return null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
      return new Response(JSON.stringify({ error: 'no_integration' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const action: Action = await req.json()
    let accessToken = integration.access_token
    let eventId: string | null = null

    try {
      eventId = await run(accessToken, action)
    } catch (err) {
      if (String(err).includes('401') && integration.refresh_token) {
        const newToken = await refreshAccessToken(integration.refresh_token)
        if (!newToken) throw new Error('Token refresh failed')
        await serviceClient
          .from('user_integrations')
          .update({ access_token: newToken, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('provider', 'google')
        eventId = await run(newToken, action)
      } else {
        throw err
      }
    }

    return new Response(JSON.stringify({ ok: true, event_id: eventId }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  } catch (err) {
    console.error('google-actions error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
