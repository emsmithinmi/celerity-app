// Parse #word occurrences from free text
export function parseHashtags(text) {
  if (!text) return []
  const matches = text.match(/#([A-Za-z]\w*)/g) ?? []
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))]
}

// Parse @word occurrences from free text
export function parseMentions(text) {
  if (!text) return []
  const matches = text.match(/@([A-Za-z]\w*)/g) ?? []
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))]
}

// Match hashtag words against the context tag pool, return new tag values to add
export function resolveHashtags(words, tagPool, existing = []) {
  const toAdd = []
  for (const word of words) {
    const match = tagPool.find(t =>
      t.value.toLowerCase() === word ||
      t.label.toLowerCase() === word
    )
    if (match && !existing.includes(match.value)) toAdd.push(match.value)
  }
  return toAdd
}

function nameVariants(p) {
  const first = (p.first_name ?? '').toLowerCase()
  const pref  = (p.preferred_name ?? '').toLowerCase()
  const last  = (p.last_name ?? '').toLowerCase()
  const set = new Set()
  if (first) set.add(first)
  if (pref)  set.add(pref)
  if (last)  set.add(last)
  if (first && last) set.add(`${first}${last}`)
  if (pref  && last) set.add(`${pref}${last}`)
  return set
}

// Match mention words against people list
// Returns { resolved: [{word, person}], ambiguous: [{word, matches}] }
export function resolveMentions(words, people, alreadyLinkedIds = new Set()) {
  const resolved  = []
  const ambiguous = []

  for (const word of words) {
    const matches = people.filter(p => nameVariants(p).has(word.toLowerCase()))
    const unlinked = matches.filter(p => !alreadyLinkedIds.has(p.id))
    if (unlinked.length === 1) resolved.push({ word, person: unlinked[0] })
    else if (unlinked.length > 1) ambiguous.push({ word, matches: unlinked })
  }

  return { resolved, ambiguous }
}
