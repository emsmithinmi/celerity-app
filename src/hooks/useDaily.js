import { useState, useEffect, useCallback } from 'react'
import {
  ensureNoteForDate,
  getDailyStats,
  updateTopOfMind,
} from '../lib/api/daily'
import { getHabitHistory, setHabitEntry } from '../lib/api/habits'
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

  const refreshHabitHistory = useCallback(async () => {
    const d = new Date(date + 'T12:00:00')
    const sun = new Date(d)
    sun.setDate(d.getDate() - d.getDay())
    const history = await getHabitHistory(sun.toLocaleDateString('en-CA'))
    setHabitHistory(history)
  }, [date])

  // Toggle a habit for any date — optimistically updates habitHistory.
  const handleToggleHabitForDate = async (habitKey, dateStr, value) => {
    setHabitHistory(prev => {
      const exists = prev.some(r => r.date === dateStr)
      return exists
        ? prev.map(r => r.date === dateStr ? { ...r, entries: { ...r.entries, [habitKey]: value } } : r)
        : [...prev, { date: dateStr, entries: { [habitKey]: value } }]
    })
    try {
      await setHabitEntry(dateStr, habitKey, value)
    } catch {
      refreshHabitHistory()
    }
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
    toggleHabitForDate: handleToggleHabitForDate,
    updateTopOfMind: handleUpdateTopOfMind,
  }
}
