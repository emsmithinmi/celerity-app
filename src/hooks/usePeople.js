import { useState, useEffect, useCallback } from 'react'
import { getPeople, createPerson } from '../lib/api/people'

export function usePeople(filters = {}) {
  const [people,  setPeople]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const filterKey = JSON.stringify(filters)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getPeople(filters)
      setPeople(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  useEffect(() => { load() }, [load])

  const handleCreate = async (fields) => {
    const person = await createPerson(fields)
    await load()
    return person
  }

  return { people, loading, error, refresh: load, createPerson: handleCreate }
}
