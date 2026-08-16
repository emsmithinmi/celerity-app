import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContextValue'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading, null = logged out

  useEffect(() => {
    clearPrivateCaches()

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        await clearInvalidSession()
        setSession(null)
        return
      }
      if (session) {
        const { error: userError } = await supabase.auth.getUser()
        if (userError && isRecoverableSessionError(userError)) {
          await clearInvalidSession()
          setSession(null)
          return
        }
      }
      setSession(session)
      if (session) saveGoogleTokens(session)
    }).catch(async (error) => {
      if (isRecoverableSessionError(error)) {
        await clearInvalidSession()
        setSession(null)
      } else {
        console.error('Unable to restore the saved session:', error)
        setSession(null)
      }
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

function isRecoverableSessionError(error) {
  const message = error?.message ?? ''
  return /jwt issued at future|invalid jwt|jwt expired|refresh token/i.test(message)
}

async function clearInvalidSession() {
  // A local sign-out removes the browser's stale token without depending on
  // that token being accepted by the Auth server.
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // The session is still cleared locally by supabase-js in normal operation.
  }
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
