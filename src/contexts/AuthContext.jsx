import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContextValue'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading, null = logged out

  useEffect(() => {
    clearPrivateCaches()

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
    await clearPrivateCaches()
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

  const payload = {
    user_id: session.user.id,
    provider: 'google',
    access_token: providerToken,
    updated_at: new Date().toISOString(),
  }
  if (providerRefreshToken) payload.refresh_token = providerRefreshToken

  const { error } = await supabase.from('user_integrations').upsert(payload, { onConflict: 'user_id,provider' })
  if (error) console.error('Unable to save Google integration tokens:', error)
}

async function clearPrivateCaches() {
  if (!('caches' in window)) return
  const cacheNames = await caches.keys()
  await Promise.all(
    cacheNames
      .filter(name => name === 'supabase-api')
      .map(name => caches.delete(name))
  )
}
