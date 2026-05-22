import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useTasks(filters = {}) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTasks = async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('tasks')
      .select('*, projects(id, title, slug)')
      .order('created_at', { ascending: false })

    if (filters.priority) query = query.eq('priority', filters.priority)
    if (filters.area)     query = query.eq('area', filters.area)

    const { data, error: err } = await query
    if (err) setError(err.message)
    else setTasks(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchTasks() }, [filters.priority, filters.area])

  const createTask = async (taskData) => {
    const { data, error: err } = await supabase
      .from('tasks')
      .insert([taskData])
      .select('*, projects(id, title, slug)')
      .single()
    if (!err) setTasks(prev => [data, ...prev])
    return { data, error: err }
  }

  const updateTask = async (id, updates) => {
    const { data, error: err } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, projects(id, title, slug)')
      .single()
    if (!err) setTasks(prev => prev.map(t => t.id === id ? data : t))
    return { data, error: err }
  }

  const deleteTask = async (id) => {
    const { error: err } = await supabase.from('tasks').delete().eq('id', id)
    if (!err) setTasks(prev => prev.filter(t => t.id !== id))
    return { error: err }
  }

  return { tasks, loading, error, createTask, updateTask, deleteTask, refetch: fetchTasks }
}
