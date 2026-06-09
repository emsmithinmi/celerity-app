// google-connect edge function
// Handles connecting additional Google accounts (beyond the primary Supabase auth account).
//
// GET  ?action=url&redirect_uri=...  → returns the Google OAuth authorization URL
// POST { code, redirect_uri, label } → exchanges code for tokens, stores in user_integrations

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_CLIENT_ID     = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return json({ error: 'Unauthorized' }, 401)

    // ── GET: return the Google OAuth URL ──────────────────────────────────────
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const redirect_uri = url.searchParams.get('redirect_uri')
      if (!redirect_uri) return json({ error: 'redirect_uri required' }, 400)

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
      authUrl.searchParams.set('redirect_uri', redirect_uri)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('scope', SCOPES)
      authUrl.searchParams.set('access_type', 'offline')
      authUrl.searchParams.set('prompt', 'consent select_account')  // force account picker + refresh token

      return json({ url: authUrl.toString() })
    }

    // ── POST: exchange code → tokens → store ─────────────────────────────────
    if (req.method === 'POST') {
      const { code, redirect_uri, label = 'work' } = await req.json()
      if (!code || !redirect_uri) return json({ error: 'code and redirect_uri required' }, 400)

      // Exchange authorization code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id:     GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          redirect_uri,
          grant_type: 'authorization_code',
        }),
      })

      if (!tokenRes.ok) {
        const err = await tokenRes.text()
        console.error('Token exchange failed:', err)
        return json({ error: 'Token exchange failed', detail: err }, 400)
      }

      const tokens = await tokenRes.json()
      const { access_token, refresh_token } = tokens

      if (!access_token) return json({ error: 'No access token in response' }, 400)

      // Get the email address for this Google account
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      if (!profileRes.ok) return json({ error: 'Failed to fetch Google profile' }, 400)

      const profile = await profileRes.json()
      const email: string = profile.email

      if (!email) return json({ error: 'Could not determine Google account email' }, 400)

      // Store (or update) in user_integrations
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      const { error: upsertError } = await serviceClient
        .from('user_integrations')
        .upsert(
          {
            user_id:       user.id,
            provider:      'google',
            email,
            label,
            access_token,
            refresh_token: refresh_token ?? null,
            updated_at:    new Date().toISOString(),
          },
          { onConflict: 'user_id,provider,email' }
        )

      if (upsertError) {
        console.error('Upsert error:', upsertError)
        return json({ error: upsertError.message }, 500)
      }

      return json({ success: true, email, label })
    }

    return json({ error: 'Method not allowed' }, 405)

  } catch (err) {
    console.error('google-connect error:', err)
    return json({ error: String(err) }, 500)
  }
})
