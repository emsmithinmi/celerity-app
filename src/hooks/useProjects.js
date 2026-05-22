import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useProjects(filters = {}) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProjects = async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.area)   query = query.eq('area', filters.area)

    const { data, error: err } = await query
    if (err) setError(err.message)
    else setProjects(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchProjects() }, [filters.status, filters.area])

  const createProject = async (projectData) => {
    const { data, error: err } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single()
    if (!err) setProjects(prev => [data, ...prev])
    return { data, error: err }
  }

  const updateProject = async (id, updates) => {
    const { data, error: err } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!err) setProjects(prev => prev.map(p => p.id === id ? data : p))
    return { data, error: err }
  }

  const deleteProject = async (id) => {
    const { error: err } = await supabase.from('projects').delete().eq('id', id)
    if (!err) setProjects(prev => prev.filter(p => p.id !== id))
    return { error: err }
  }

  return { projects, loading, error, createProject, updateProject, deleteProject, refetch: fetchProjects }
}
