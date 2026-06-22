import { useState, useRef, useCallback } from 'react'

/**
 * Drag-to-reorder for a list of `{ id, sort_order }` items where the canonical
 * order lives in the DB. On drop, rewrites every item's sort_order to (i+1)*10
 * and calls the provided `updateItem(id, { sort_order })` for each one, then
 * calls `reload()` so the source-of-truth catches up.
 *
 * Optimistic: `localOrder` shows the new arrangement immediately while writes
 * are in flight.
 */
export function useSortableList(items, updateItem, reload) {
  const [localOrder, setLocalOrder] = useState(null) // array of ids, or null = use items order
  const [dragOverId, setDragOverId] = useState(null)
  const dragId = useRef(null)

  const ordered = localOrder
    ? localOrder.map(id => items.find(i => i.id === id)).filter(Boolean)
    : items

  const handleDragStart = useCallback((id) => { dragId.current = id }, [])
  const handleDragOver  = useCallback((e, id) => { e.preventDefault(); setDragOverId(id) }, [])
  const handleDragEnd   = useCallback(() => { dragId.current = null; setDragOverId(null) }, [])

  const handleDrop = useCallback(async (toId) => {
    const fromId = dragId.current
    handleDragEnd()
    if (!fromId || !toId || fromId === toId) return
    const ids = ordered.map(i => i.id)
    const fromIdx = ids.indexOf(fromId)
    const toIdx   = ids.indexOf(toId)
    if (fromIdx === -1 || toIdx === -1) return
    ids.splice(fromIdx, 1)
    ids.splice(toIdx, 0, fromId)
    setLocalOrder(ids)
    try {
      await Promise.all(ids.map((id, i) => updateItem(id, { sort_order: (i + 1) * 10 })))
      reload?.()
      setLocalOrder(null) // let the reloaded items drive ordering
    } catch (err) {
      console.error('Reorder failed:', err)
      setLocalOrder(null)
    }
  }, [ordered, updateItem, reload, handleDragEnd])

  return { ordered, dragOverId, handleDragStart, handleDragOver, handleDrop, handleDragEnd }
}
