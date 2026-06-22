import { useState, useEffect, useMemo, useRef, useCallback } from 'react'

/**
 * Display-only drag-to-reorder for a list of `{ id }` items, persisted to
 * localStorage under `storageKey`. No DB writes — order is per-device, per-list.
 *
 * Returns the ordered items plus handlers to wire onto a drag handle (drag
 * source) and each row wrapper (drop target):
 *   - handleDragStart(id)   → call from the handle's onDragStart
 *   - handleDragOver(e, id) → call from each row's onDragOver
 *   - handleDrop(id)        → call from each row's onDrop
 *   - handleDragEnd()       → call from the handle's onDragEnd
 *   - dragOverId            → id currently hovered (for a drop indicator)
 */
function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) ?? [] } catch { return [] }
}

function persist(key, ids) {
  try { localStorage.setItem(key, JSON.stringify(ids)) } catch { /* ignore */ }
}

export function applyOrder(items, orderedIds) {
  const indexMap = Object.fromEntries(orderedIds.map((id, i) => [id, i]))
  return [...items].sort((a, b) => {
    const ai = indexMap[a.id] ?? Infinity
    const bi = indexMap[b.id] ?? Infinity
    return ai - bi
  })
}

export function useListOrder(storageKey, items) {
  const [order, setOrder] = useState(() => load(storageKey))
  const [dragOverId, setDragOverId] = useState(null)
  const dragId = useRef(null)

  // Reload saved order when the list (tab/project) changes
  useEffect(() => { setOrder(load(storageKey)) }, [storageKey])

  const ordered = useMemo(() => applyOrder(items, order), [items, order])

  const handleDragStart = useCallback((id) => { dragId.current = id }, [])
  const handleDragOver  = useCallback((e, id) => { e.preventDefault(); setDragOverId(id) }, [])
  const handleDragEnd   = useCallback(() => { dragId.current = null; setDragOverId(null) }, [])

  const handleDrop = useCallback((id) => {
    const from = dragId.current
    handleDragEnd()
    if (!from || !id || from === id) return
    const ids = ordered.map(i => i.id)
    const fromIdx = ids.indexOf(from)
    const toIdx   = ids.indexOf(id)
    if (fromIdx === -1 || toIdx === -1) return
    ids.splice(fromIdx, 1)
    ids.splice(toIdx, 0, from)
    setOrder(ids)
    persist(storageKey, ids)
  }, [ordered, storageKey, handleDragEnd])

  return { ordered, dragOverId, handleDragStart, handleDragOver, handleDrop, handleDragEnd }
}
