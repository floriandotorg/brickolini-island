type AnimationCandidate = { location: number; name: string; numPlayed: number; actorMask: number; active: boolean; modelInfo: readonly { name: string }[] }

export const findAnimationRange = (entries: readonly { location: number }[], location: number): [number, number] | null => {
  let first = -1
  for (let n = 0; n < entries.length; ++n) {
    if (entries[n].location === location) {
      first = n
      break
    }
    if (entries[n].location === -1) {
      break
    }
  }
  if (first < 0) {
    return null
  }
  let end = first + 1
  while (end < entries.length && entries[end].location === location) {
    ++end
  }
  return [first, end]
}

export const selectLocationAnimation = <T extends AnimationCandidate>(entries: readonly T[], location: number, player: string | null, mask: number): T | null => {
  const range = findAnimationRange(entries, location)
  if (range == null) {
    return null
  }
  let best: T | null = null
  for (const entry of entries.slice(...range)) {
    if (
      entry.active &&
      (entry.actorMask & mask) !== 0 &&
      !entry.modelInfo.some(model => model.name.toLowerCase() === player || (model.name.toLowerCase() === 'pep' && player === 'pepper')) &&
      entry.name[0] !== 'I' &&
      (entry.numPlayed === 0 || entry.name[0] !== 'i') &&
      (best == null || entry.numPlayed < best.numPlayed)
    ) {
      best = entry
    }
  }
  return best
}

export const proximityBand = (speed: number): { min: number; max: number } | null => {
  if (speed <= -1 || speed >= 10) {
    return null
  }
  for (const [threshold, max, min] of [
    [7, 144, 100],
    [5, 100, 36],
    [3, 36, 25],
    [1, 25, 16],
    [-1, 16, 2],
  ]) {
    if (speed > threshold) {
      return { min, max }
    }
  }
  return null
}
