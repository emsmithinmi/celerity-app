import { useState, useEffect, useCallback } from 'react'
import {
  ensureNoteForDate,
  getHabitHistory,
  getDailyStats,
  toggleHabit,
  addNoteEntry,
  updateNotesArray,
  updateTopOfMind,
} from '../lib/api/daily'

export function useDaily(date) {
  const [note, setNote]                 = useState(null)
  const [habitHistory, setHabitHistory] = useState([])
  const [stats, setStats]               = useState({ inProgress: 0, nextActions: 0, waiting: 0, dueToday: 0, stalled: 0 })
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dayNote, history, dailyStats] = await Promise.all([
        ensureNoteForDate(date),
        getHabitHistory(7),
        getDailyStats(date),
      ])
      setNote(dayNote)
      setHabitHistory(history)
      setStats(dailyStats)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { load() }, [load])

  const handleToggleHabit = async (habitKey, value) => {
    if (!note) return
    // Optimistic update
    setNote(prev => ({ ...prev, [habitKey]: value }))
    try {
      const updated = await toggleHabit(note.id, habitKey, value)
      setNote(updated)
      const history = await getHabitHistory(7)
      setHabitHistory(history)
    } catch {
      // Revert on error
      setNote(prev => ({ ...prev, [habitKey]: !value }))
    }
  }

  const handleAddNote = async (body) => {
    if (!note) return
    const updated = await addNoteEntry(note.id, body)
    setNote(updated)
  }

  const handleEditNote = async (timestamp, newBody) => {
    if (!note) return
    const updatedNotes = (note.notes ?? []).map(n =>
      n.timestamp === timestamp ? { ...n, body: newBody } : n
    )
    const updated = await updateNotesArray(note.id, updatedNotes)
    setNote(updated)
  }

  const handleDeleteNote = async (timestamp) => {
    if (!note) return
    const updatedNotes = (note.notes ?? []).filter(n => n.timestamp !== timestamp)
    const updated = await updateNotesArray(note.id, updatedNotes)
    setNote(updated)
  }

  const handleUpdateTopOfMind = async (items) => {
    if (!note) return
    const updated = await updateTopOfMind(note.id, items)
    setNote(updated)
  }

  const refreshStats = async () => {
    const dailyStats = await getDailyStats(date)
    setStats(dailyStats)
  }

  return {
    note,
    habitHistory,
    stats,
    loading,
    error,
    refresh: load,
    refreshStats,
    toggleHabit: handleToggleHabit,
    addNote: handleAddNote,
    editNote: handleEditNote,
    deleteNote: handleDeleteNote,
    updateTopOfMind: handleUpdateTopOfMind,
  }
}
