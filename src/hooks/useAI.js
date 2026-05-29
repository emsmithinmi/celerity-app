import { useState, useEffect, useCallback } from 'react'
import { getAIConfig, isConfigured } from '../lib/ai/config'
import { testConnection } from '../lib/ai/client'

// General hook for reading AI config state
export function useAIConfig() {
  const [config,     setConfig]     = useState(null)
  const [configured, setConfigured] = useState(false)
  const [loading,    setLoading]    = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const cfg = await getAIConfig()
    setConfig(cfg)
    setConfigured(isConfigured(cfg))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return { config, configured, loading, reload: load }
}

// Hook for running a skill with loading/error state
export function useSkill(skillFn) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [result,  setResult]  = useState(null)

  const run = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const res = await skillFn(...args)
      setResult(res)
      return res
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [skillFn])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { run, loading, error, result, reset }
}

// Hook for the test-connection action in Settings
export function useAITest() {
  const [testing, setTesting] = useState(false)
  const [status,  setStatus]  = useState(null) // 'ok' | 'error' | null

  const test = async () => {
    setTesting(true)
    setStatus(null)
    try {
      const ok = await testConnection()
      setStatus(ok ? 'ok' : 'error')
    } catch {
      setStatus('error')
    } finally {
      setTesting(false)
    }
  }

  return { test, testing, status }
}
