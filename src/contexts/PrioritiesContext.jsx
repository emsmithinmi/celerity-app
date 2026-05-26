import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getPriorities } from '../lib/api/priorities'

const PrioritiesContext = createContext(null)

export function PrioritiesProvider({ children }) {
  const [priorities, setPriorities] = useState([])
  const [loading,    setLoading]    = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await getPriorities()
      setPriorities(data)
    } catch (err) {
      console.error('Failed to load priorities:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // O(1) lookup by value string
  const priorityMap = Object.fromEntries(priorities.map(p => [p.value, p]))

  return (
    <PrioritiesContext.Provider value={{ priorities, priorityMap, loading, reload: load }}>
      {children}
    </PrioritiesContext.Provider>
  )
}

export function usePriorities() {
  const ctx = useContext(PrioritiesContext)
  if (!ctx) throw new Error('usePriorities must be used within <PrioritiesProvider>')
  return ctx
}
