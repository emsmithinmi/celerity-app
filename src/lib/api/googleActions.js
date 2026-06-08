/**
 * Client for the google-actions Supabase edge function.
 * Handles create / update / delete of Google Calendar events for scheduled tasks.
 * Silently no-ops when the user has no Google integration connected.
 */

import { supabase } from '../supabase'

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-actions`

async function callGoogleActions(action) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const res = await fetch(EDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(action),
  })

  // No Google integration linked — silent skip, not an error
  if (res.status === 400) {
    const body = await res.json().catch(() => ({}))
    if (body.error === 'no_integration') return null
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `google-actions HTTP ${res.status}`)
  }

  return res.json()
}

/**
 * Parse a Postgres interval string ("HH:MM:SS" or "X hours Y mins") to total minutes.
 * Returns 60 (1 hour) as the default when duration is absent.
 */
function intervalToMinutes(intervalStr) {
  if (!intervalStr) return 60

  const timeMatch = intervalStr.match(/^(\d+):(\d{2}):(\d{2})$/)
  if (timeMatch) {
    return parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2])
  }

  const h = intervalStr.match(/(\d+)\s+hour/)
  const m = intervalStr.match(/(\d+)\s+min/)
  const total = (h ? parseInt(h[1]) : 0) * 60 + (m ? parseInt(m[1]) : 0)
  return total || 60
}

/**
 * Add minutes to a "HH:MM" time string, returning new "HH:MM" and whether the day rolled over.
 */
function addMinutesToTime(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number)
  const total  = h * 60 + m + minutes
  const endH   = Math.floor(total / 60) % 24
  const endM   = total % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

/**
 * Build start/end ISO strings and allDay flag from task fields.
 */
function buildEventTimes(due_date, scheduled_time, duration) {
  if (!scheduled_time) {
    // All-day event — GCal wants just the date string
    return { start: due_date, end: due_date, allDay: true }
  }

  const durationMins = intervalToMinutes(duration)
  const endTime      = addMinutesToTime(scheduled_time, durationMins)

  return {
    start:  `${due_date}T${scheduled_time}:00`,
    end:    `${due_date}T${endTime}:00`,
    allDay: false,
  }
}

/**
 * Create or update a Google Calendar event for a scheduled task.
 * Returns the gcal_event_id to store on the task, or null if no integration.
 *
 * Pass the full task object (must have due_date; scheduled_time / duration / gcal_event_id optional).
 */
export async function scheduleTaskOnCalendar(task) {
  const { title, description, due_date, scheduled_time, duration, gcal_event_id } = task

  if (!due_date) return null   // can't create an event without a date

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const { start, end, allDay } = buildEventTimes(due_date, scheduled_time, duration)

  let result

  if (gcal_event_id) {
    // Already has a calendar event — update it
    result = await callGoogleActions({
      type:     'update_calendar_event',
      event_id: gcal_event_id,
      fields: {
        summary:     title,
        description: description ?? undefined,
        start,
        end,
        all_day:  allDay,
        timezone: tz,
      },
    })
    return gcal_event_id   // ID doesn't change on update
  } else {
    // Create a new event
    result = await callGoogleActions({
      type:  'create_calendar_event',
      event: {
        summary:     title,
        description: description ?? undefined,
        start,
        end,
        all_day:  allDay,
        timezone: tz,
      },
    })
    return result?.event_id ?? null
  }
}

/**
 * Delete a Google Calendar event when a task is unscheduled or rerouted.
 * Silent no-op if no ID or no integration.
 */
export async function deleteTaskCalendarEvent(gcalEventId) {
  if (!gcalEventId) return
  await callGoogleActions({
    type:     'delete_calendar_event',
    event_id: gcalEventId,
  }).catch(() => {})   // best-effort — never block the UI
}
