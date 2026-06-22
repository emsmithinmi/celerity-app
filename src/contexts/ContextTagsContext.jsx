import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getContextTags } from '../lib/api/contextTags'

const ContextTagsContext = createContext(null)

export function ContextTagsProvider({ children }) {
  const [tags,    setTags]    = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await getContextTags()
      setTags(data)
    } catch (err) {
      console.error('Failed to load context tags:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Map by value (slug) for quick color lookups inside lists
  const tagMap = Object.fromEntries(tags.map(t => [t.value, t]))

  return (
    <ContextTagsContext.Provider value={{ tags, tagMap, loading, reload: load }}>
      {children}
    </ContextTagsContext.Provider>
  )
}

export function useContextTags() {
  const ctx = useContext(ContextTagsContext)
  if (!ctx) throw new Error('useContextTags must be used within <ContextTagsProvider>')
  return ctx
}
