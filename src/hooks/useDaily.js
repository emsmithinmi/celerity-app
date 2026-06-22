import { useState, useEffect, useCallback } from 'react'
import {
  ensureNoteForDate,
  getHabitHistory,
  getDailyStats,
  toggleHabit,
  setHabitForDate,
  addNoteEntry,
  updateNotesArray,
  updateTopOfMind,
} from '../lib/api/daily'
import { eventBus } from '../lib/eventBus'

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
      const now = new Date(date + 'T12:00:00')
      const weekSunday = new Date(now)
      weekSunday.setDate(now.getDate() - now.getDay())
      const weekStart = weekSunday.toLocaleDateString('en-CA')

      const [dayNote, history, dailyStats] = await Promise.all([
        ensureNoteForDate(date),
        getHabitHistory(weekStart),
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

  const refreshStats = useCallback(async () => {
    const dailyStats = await getDailyStats(date)
    setStats(dailyStats)
  }, [date])

  // Refresh stats whenever tasks, projects, or people change elsewhere in the app
  useEffect(() => {
    const unsub = [
      eventBus.on('tasks:changed',    refreshStats),
      eventBus.on('projects:changed', refreshStats),
      eventBus.on('people:changed',   refreshStats),
    ]
    return () => unsub.forEach(fn => fn())
  }, [refreshStats])

  const handleToggleHabit = async (habitKey, value) => {
    if (!note) return
    // Optimistic update
    setNote(prev => ({ ...prev, [habitKey]: value }))
    try {
      const updated = await toggleHabit(note.id, habitKey, value)
      setNote(updated)
      const d = new Date(date + 'T12:00:00')
      const sun = new Date(d)
      sun.setDate(d.getDate() - d.getDay())
      const history = await getHabitHistory(sun.toLocaleDateString('en-CA'))
      setHabitHistory(history)
    } catch {
      // Revert on error
      setNote(prev => ({ ...prev, [habitKey]: !value }))
    }
  }

  // Toggle a habit for any day of the current week (back-fill a missed day).
  const handleToggleHabitForDate = async (habitKey, dateStr, value) => {
    if (dateStr === date) setNote(prev => prev ? { ...prev, [habitKey]: value } : prev)
    try {
      const updated = await setHabitForDate(dateStr, habitKey, value)
      if (dateStr === date) setNote(updated)
      const d = new Date(date + 'T12:00:00')
      const sun = new Date(d)
      sun.setDate(d.getDate() - d.getDay())
      const history = await getHabitHistory(sun.toLocaleDateString('en-CA'))
      setHabitHistory(history)
    } catch {
      if (dateStr === date) setNote(prev => prev ? { ...prev, [habitKey]: !value } : prev)
    }
  }

  const handleAddNote = async (body) => {
    if (!note) return
    const newEntry = { timestamp: new Date().toISOString(), body }
    const updatedNotes = [...(note.notes ?? []), newEntry]
    const updated = await updateNotesArray(note.id, updatedNotes)
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

  return {
    note,
    habitHistory,
    stats,
    loading,
    error,
    refresh: load,
    refreshStats,
    toggleHabit: handleToggleHabit,
    toggleHabitForDate: handleToggleHabitForDate,
    addNote: handleAddNote,
    editNote: handleEditNote,
    deleteNote: handleDeleteNote,
    updateTopOfMind: handleUpdateTopOfMind,
  }
}
