import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useDaily(date) {
  const [note, setNote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchOrCreate = async () => {
      setLoading(true)
      setError(null)

      let { data, error: fetchErr } = await supabase
        .from('daily_notes')
        .select('*')
        .eq('date', date)
        .maybeSingle()

      if (fetchErr) { setError(fetchErr.message); setLoading(false); return }

      if (!data) {
        const { data: created, error: createErr } = await supabase
          .from('daily_notes')
          .insert({ date, top_of_mind: [], notes: null, quote: null })
          .select()
          .single()
        if (createErr) { setError(createErr.message); setLoading(false); return }
        data = created
      }

      setNote(data)
      setLoading(false)
    }

    fetchOrCreate()
  }, [date])

  const updateField = async (field, value) => {
    setNote((prev) => ({ ...prev, [field]: value }))
    await supabase.from('daily_notes').update({ [field]: value }).eq('date', date)
  }

  return { note, loading, error, updateField }
}
