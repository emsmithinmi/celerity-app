import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function usePeople() {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPeople = async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('people')
      .select('*')
      .order('name', { ascending: true })
    if (err) setError(err.message)
    else setPeople(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchPeople() }, [])

  const createPerson = async (data) => {
    const { data: person, error: err } = await supabase
      .from('people').insert(data).select().single()
    if (!err && person)
      setPeople((prev) => [...prev, person].sort((a, b) => a.name.localeCompare(b.name)))
    return { data: person, error: err }
  }

  const updatePerson = async (id, updates) => {
    const { data: person, error: err } = await supabase
      .from('people').update(updates).eq('id', id).select().single()
    if (!err && person)
      setPeople((prev) => prev.map((p) => (p.id === id ? person : p)))
    return { data: person, error: err }
  }

  const deletePerson = async (id) => {
    const { error: err } = await supabase.from('people').delete().eq('id', id)
    if (!err) setPeople((prev) => prev.filter((p) => p.id !== id))
    return { error: err }
  }

  return { people, loading, error, createPerson, updatePerson, deletePerson, refetch: fetchPeople }
}
