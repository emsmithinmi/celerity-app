import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

// Dev-only: seed a saved session so the preview auto-logs in without hitting OAuth.
// Set VITE_DEV_SESSION in .env.local (gitignored) — copy the value from
// DevTools → Application → Local Storage → sb-egxbhglczkslnskxorlf-auth-token
if (import.meta.env.DEV && import.meta.env.VITE_DEV_SESSION) {
  const key = 'sb-egxbhglczkslnskxorlf-auth-token'
  try {
    localStorage.setItem(key, import.meta.env.VITE_DEV_SESSION)
  } catch {}
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
