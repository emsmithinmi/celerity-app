import { useState, useEffect, useCallback } from 'react'
import { getTasks, createTask } from '../lib/api/tasks'

export function useTasks(filters = {}) {
  const [tasks, setTasks]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  const filterKey = JSON.stringify(filters)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTasks(filters)
      setTasks(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  useEffect(() => { load() }, [load])

  const handleCreate = async (title) => {
    const task = await createTask({ title })
    await load() // refresh to get full join data
    return task
  }

  return { tasks, loading, error, refresh: load, createTask: handleCreate }
}
