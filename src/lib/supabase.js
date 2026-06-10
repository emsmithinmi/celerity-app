import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Dev-only: auto sign-in so the preview bypasses OAuth.
// Set VITE_DEV_EMAIL + VITE_DEV_PASSWORD in .env.local (gitignored).
if (import.meta.env.DEV && import.meta.env.VITE_DEV_EMAIL && import.meta.env.VITE_DEV_PASSWORD) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) {
      supabase.auth.signInWithPassword({
        email: import.meta.env.VITE_DEV_EMAIL,
        password: import.meta.env.VITE_DEV_PASSWORD,
      })
    }
  })
}
