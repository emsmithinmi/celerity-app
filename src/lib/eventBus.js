// Lightweight in-process invalidation bus.
// Emit after any mutation; hooks subscribe to refetch.
// Cross-tab/cross-device changes still require a manual refresh.

const listeners = {}

export const eventBus = {
  on(event, fn) {
    if (!listeners[event]) listeners[event] = new Set()
    listeners[event].add(fn)
    return () => listeners[event].delete(fn)
  },
  emit(event, payload) {
    listeners[event]?.forEach(fn => fn(payload))
    // Wildcard listeners
    listeners['*']?.forEach(fn => fn(event, payload))
  },
}
