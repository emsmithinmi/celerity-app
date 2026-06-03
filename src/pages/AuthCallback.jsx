import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    // Check for OAuth errors in the URL
    const params = new URLSearchParams(window.location.search)
    const errorParam = params.get('error')
    const errorDescription = params.get('error_description')

    if (errorParam) {
      setError(errorDescription || errorParam)
      return
    }

    // Supabase auto-handles the PKCE code exchange via detectSessionInUrl.
    // We just listen for the SIGNED_IN event and redirect.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        navigate('/daily', { replace: true })
      }
      if (event === 'SIGNED_OUT') {
        subscription.unsubscribe()
        setError('Sign in was cancelled or failed.')
      }
    })

    // Also check if session already exists (in case event fired before listener attached)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe()
        navigate('/daily', { replace: true })
      }
    })

    // Timeout fallback
    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      setError('Sign in timed out. Please try again.')
    }, 15000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }

    handleCallback()
  }, [navigate])

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--app-bg)' }}
      >
        <div className="text-center space-y-3">
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            Sign in failed: {error}
          </p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="text-sm underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--app-bg)' }}
    >
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Signing you in...
      </div>
    </div>
  )
}
