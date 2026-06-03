import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const errorParam = params.get('error')
      const errorDescription = params.get('error_description')

      if (errorParam) {
        setError(errorDescription || errorParam)
        return
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setError(error.message)
          return
        }
      }

      navigate('/daily', { replace: true })
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
