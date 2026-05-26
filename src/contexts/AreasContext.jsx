import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getAreas } from '../lib/api/areas'

const AreasContext = createContext(null)

export function AreasProvider({ children }) {
  const [areas,   setAreas]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await getAreas()
      setAreas(data)
    } catch (err) {
      console.error('Failed to load areas:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <AreasContext.Provider value={{ areas, loading, reload: load }}>
      {children}
    </AreasContext.Provider>
  )
}

export function useAreas() {
  const ctx = useContext(AreasContext)
  if (!ctx) throw new Error('useAreas must be used within <AreasProvider>')
  return ctx
}
