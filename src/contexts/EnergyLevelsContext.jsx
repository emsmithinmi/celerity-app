import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getEnergyLevels } from '../lib/api/energyLevels'

const EnergyLevelsContext = createContext(null)

export function EnergyLevelsProvider({ children }) {
  const [levels,  setLevels]  = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await getEnergyLevels()
      setLevels(data)
    } catch (err) {
      console.error('Failed to load energy levels:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // O(1) lookup by value string
  const levelMap = Object.fromEntries(levels.map(l => [l.value, l]))

  return (
    <EnergyLevelsContext.Provider value={{ levels, levelMap, loading, reload: load }}>
      {children}
    </EnergyLevelsContext.Provider>
  )
}

export function useEnergyLevels() {
  const ctx = useContext(EnergyLevelsContext)
  if (!ctx) throw new Error('useEnergyLevels must be used within <EnergyLevelsProvider>')
  return ctx
}
