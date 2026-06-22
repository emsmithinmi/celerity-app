// Handles the OAuth redirect from Google when connecting a second Google account.
// Google redirects here with ?code=... after the user grants permission.
// This page sends the code to the google-connect edge function, then redirects to Settings.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { connectGoogleAccount } from '../lib/api/googleConnect'

export default function GoogleCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('Connecting your Google account…')
  const [error, setError] = useState(null)

  useEffect(() => {
    async function handleCallback() {
      const params  = new URLSearchParams(window.location.search)
      const code    = params.get('code')
      const errorParam = params.get('error')

      if (errorParam) {
        setError(`Google denied access: ${errorParam}`)
        return
      }

      if (!code) {
        setError('No authorization code received from Google.')
        return
      }

      try {
        const redirectUri = `${window.location.origin}/auth/google-callback`
        const label = sessionStorage.getItem('google_connect_label') ?? 'work'
        sessionStorage.removeItem('google_connect_label')

        const result = await connectGoogleAccount(code, redirectUri, label)
        setStatus(`Connected ${result.email}`)

        // Brief pause so the user sees the success message, then back to Settings
        setTimeout(() => navigate('/settings', { replace: true }), 1200)
      } catch (err) {
        setError(err.message ?? 'Something went wrong connecting your account.')
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--app-bg)' }}>
      <div className="text-center space-y-3 max-w-sm px-6">
        {error ? (
          <>
            <p className="text-lg font-semibold" style={{ color: 'var(--state-danger-text)' }}>Connection failed</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            <button
              onClick={() => navigate('/settings')}
              className="text-sm underline"
              style={{ color: 'var(--accent)' }}
            >
              Back to Settings
            </button>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
                 style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{status}</p>
          </>
        )}
      </div>
    </div>
  )
}
