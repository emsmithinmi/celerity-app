import { supabase } from '../supabase'

const EDGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-connect`

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  }
}

/**
 * Fetch all connected Google accounts for the current user.
 */
export async function getConnectedGoogleAccounts() {
  const { data, error } = await supabase
    .from('user_integrations')
    .select('id, email, label, updated_at')
    .eq('provider', 'google')
    .order('updated_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/**
 * Get the Google OAuth URL to start connecting a second account.
 * redirectUri must exactly match what's registered in Google Cloud Console.
 */
export async function getGoogleConnectUrl(redirectUri) {
  const headers = await authHeaders()
  const url = new URL(EDGE_BASE)
  url.searchParams.set('action', 'url')
  url.searchParams.set('redirect_uri', redirectUri)

  const res = await fetch(url.toString(), { headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  const json = await res.json()
  return json.url
}

/**
 * Exchange an OAuth code for tokens and store the new account.
 * Called by GoogleCallback after Google redirects back.
 */
export async function connectGoogleAccount(code, redirectUri, label = 'work') {
  const headers = await authHeaders()
  const res = await fetch(EDGE_BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code, redirect_uri: redirectUri, label }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()  // { success, email, label }
}

/**
 * Remove a connected Google account (by its user_integrations row id).
 * Does not affect the primary Supabase auth session.
 */
export async function disconnectGoogleAccount(id) {
  const { error } = await supabase
    .from('user_integrations')
    .delete()
    .eq('id', id)
  if (error) throw error
}
