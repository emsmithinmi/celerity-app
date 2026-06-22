import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { parseDuration } from '../components/ui/DurationDisplay'
import { usePriorities } from '../contexts/PrioritiesContext'
import { useEnergyLevels } from '../contexts/EnergyLevelsContext'
import {
  getListPreference,
  setListSortMode,
  setListManualOrder,
} from '../lib/api/listPreferences'

// Sort modes offered by the dropdown on every task list. "manual" preserves
// drag-to-reorder; everything else is an auto sort that ignores manual_order.
export const SORT_MODES = [
  { key: 'manual',       label: 'Manual'                  },
  { key: 'newest',       label: 'Newest first'            },
  { key: 'oldest',       label: 'Oldest first'            },
  { key: 'duration_desc', label: 'Longest first'          },
  { key: 'duration_asc',  label: 'Shortest first'         },
  { key: 'due_asc',       label: 'Due soonest'            },
  { key: 'priority',      label: 'Priority (high → low)'  },
  { key: 'alpha',         label: 'Alphabetical (A → Z)'   },
  { key: 'energy',        label: 'Energy (high → low)'    },
  { key: 'area',          label: 'Area (A → Z)'           },
]

function durationSeconds(t) {
  const total = parseDuration(t.duration).total
  return total > 0 ? total : null
}

function nullsLast(getValue, dir = 'asc') {
  return (a, b) => {
    const av = getValue(a)
    const bv = getValue(b)
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (av < bv) return dir === 'asc' ? -1 : 1
    if (av > bv) return dir === 'asc' ? 1 : -1
    return 0
  }
}

function buildComparator(mode, { priorityMap, energyMap }) {
  switch (mode) {
    case 'newest':
      return nullsLast(t => t.created_at, 'desc')
    case 'oldest':
      return nullsLast(t => t.created_at, 'asc')
    case 'duration_desc':
      return nullsLast(durationSeconds, 'desc')
    case 'duration_asc':
      return nullsLast(durationSeconds, 'asc')
    case 'due_asc':
      return nullsLast(t => t.due_date, 'asc')
    case 'priority':
      // Lower sort_order = higher priority (the badge convention).
      return nullsLast(t => priorityMap[t.priority]?.sort_order, 'asc')
    case 'energy':
      return nullsLast(t => energyMap[t.energy_level]?.sort_order, 'asc')
    case 'alpha':
      return nullsLast(t => (t.title ?? '').toLowerCase(), 'asc')
    case 'area':
      return nullsLast(t => (t.area ?? '').toLowerCase(), 'asc')
    default:
      return null
  }
}

function applyManualOrder(items, ids) {
  if (!ids?.length) return items
  const indexMap = Object.fromEntries(ids.map((id, i) => [id, i]))
  return [...items].sort((a, b) => {
    const ai = indexMap[a.id] ?? Infinity
    const bi = indexMap[b.id] ?? Infinity
    return ai - bi
  })
}

/**
 * Per-list sort preference + manual-order persistence, synced to Supabase
 * via the `list_preferences` table. Pass a stable `listKey` per list.
 *
 * When `enabled` is false (e.g. user is searching or multi-selecting), the
 * hook returns items in their original order and disables drag handlers —
 * the sort mode the user picked is still preserved in DB.
 */
export function useTaskListSort(listKey, items, { enabled = true } = {}) {
  const { priorityMap } = usePriorities()
  const { levelMap: energyMap } = useEnergyLevels()

  const [sortMode, setSortModeState] = useState('manual')
  const [manualOrder, setManualOrderState] = useState([])
  const [loading, setLoading] = useState(true)
  const [dragOverId, setDragOverId] = useState(null)
  const dragId = useRef(null)

  // Load preference for this list (and reload when listKey changes).
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getListPreference(listKey)
      .then(pref => {
        if (cancelled) return
        setSortModeState(pref.sort_mode || 'manual')
        setManualOrderState(Array.isArray(pref.manual_order) ? pref.manual_order : [])
      })
      .catch(() => {
        if (cancelled) return
        setSortModeState('manual')
        setManualOrderState([])
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [listKey])

  const ordered = useMemo(() => {
    if (!enabled) return items
    if (sortMode === 'manual') return applyManualOrder(items, manualOrder)
    const cmp = buildComparator(sortMode, { priorityMap, energyMap })
    return cmp ? [...items].sort(cmp) : items
  }, [items, sortMode, manualOrder, priorityMap, energyMap, enabled])

  const setSortMode = useCallback((mode) => {
    setSortModeState(mode)
    setListSortMode(listKey, mode).catch(() => { /* best-effort */ })
  }, [listKey])

  const handleDragStart = useCallback((id) => { dragId.current = id }, [])
  const handleDragOver  = useCallback((e, id) => { e.preventDefault(); setDragOverId(id) }, [])
  const handleDragEnd   = useCallback(() => { dragId.current = null; setDragOverId(null) }, [])

  const handleDrop = useCallback((id) => {
    const from = dragId.current
    handleDragEnd()
    if (!from || !id || from === id) return
    if (sortMode !== 'manual' || !enabled) return
    const ids = ordered.map(i => i.id)
    const fromIdx = ids.indexOf(from)
    const toIdx   = ids.indexOf(id)
    if (fromIdx === -1 || toIdx === -1) return
    ids.splice(fromIdx, 1)
    ids.splice(toIdx, 0, from)
    setManualOrderState(ids)
    setListManualOrder(listKey, ids).catch(() => { /* best-effort */ })
  }, [ordered, sortMode, enabled, listKey, handleDragEnd])

  const isReorderable = enabled && sortMode === 'manual'

  return {
    ordered,
    sortMode,
    setSortMode,
    isReorderable,
    loading,
    dragOverId,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  }
}
