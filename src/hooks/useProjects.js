import { useState, useEffect, useCallback } from 'react'
import { getProjects, createProject } from '../lib/api/projects'

export function useProjects(filters = {}) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const filterKey = JSON.stringify(filters)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getProjects(filters)
      setProjects(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  useEffect(() => { load() }, [load])

  const handleCreate = async (title) => {
    const project = await createProject({ title })
    await load()
    return project
  }

  return { projects, loading, error, refresh: load, createProject: handleCreate }
}
