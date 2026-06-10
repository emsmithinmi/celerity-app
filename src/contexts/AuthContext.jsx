import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading, null = logged out

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) saveGoogleTokens(session)
    })

    // Listen for auth changes (magic link clicks, logouts, Google OAuth callbacks, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (session) saveGoogleTokens(session)
      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = '/reset-password'
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, signOut, loading: session === undefined }}>
      {children}
    </AuthContext.Provider>
  )
}

// When a user signs in with Google, Supabase surfaces the provider tokens
// on the session. We persist them to user_integrations so edge functions
// can use them server-side without needing the client session.
async function saveGoogleTokens(session) {
  const providerToken = session?.provider_token
  const providerRefreshToken = session?.provider_refresh_token
  if (!providerToken) return // not a Google OAuth session

  await supabase.from('user_integrations').upsert(
    {
      user_id: session.user.id,
      provider: 'google',
      access_token: providerToken,
      refresh_token: providerRefreshToken ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,provider' }
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
