import { parseDuration } from '../components/ui/DurationDisplay'

/**
 * Time-weighted progress across a list of items.
 * items: [{ done: bool, duration: interval string|null }]
 *
 * When some items have duration estimates, the bar is weighted by time —
 * unestimated items count as the average of the estimated ones. When nothing
 * is estimated, falls back to plain done/total counting. Displayed time
 * totals (totalSeconds/doneSeconds/remainingSeconds) only sum real estimates;
 * the default weight is for the bar fraction only.
 */
export function computeProgress(items = []) {
  const totalCount = items.length
  const doneCount  = items.filter(i => i.done).length

  const seconds = items.map(i => parseDuration(i.duration).total || null)
  const estimated = seconds.filter(s => s !== null)
  const hasEstimates = estimated.length > 0

  const totalSeconds = estimated.reduce((a, s) => a + s, 0)
  const doneSeconds  = items.reduce((a, i, idx) =>
    a + (i.done && seconds[idx] !== null ? seconds[idx] : 0), 0)

  let fraction = 0
  if (totalCount > 0) {
    if (!hasEstimates) {
      fraction = doneCount / totalCount
    } else {
      const defaultWeight = totalSeconds / estimated.length
      let weightTotal = 0, weightDone = 0
      items.forEach((i, idx) => {
        const w = seconds[idx] ?? defaultWeight
        weightTotal += w
        if (i.done) weightDone += w
      })
      fraction = weightTotal > 0 ? weightDone / weightTotal : 0
    }
  }

  return {
    fraction,
    percent: Math.round(fraction * 100),
    doneCount,
    totalCount,
    totalSeconds,
    doneSeconds,
    remainingSeconds: Math.max(0, totalSeconds - doneSeconds),
    hasEstimates,
  }
}

export function formatSeconds(totalSeconds = 0) {
  const hours   = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return `${hours}:${String(minutes).padStart(2, '0')}`
}

/** Map a project's tasks to progress items (done = done or archived). */
export function projectTasksToProgressItems(tasks = []) {
  return tasks.map(t => ({
    done: t.status === 'done' || t.status === 'archived',
    duration: t.duration,
  }))
}
