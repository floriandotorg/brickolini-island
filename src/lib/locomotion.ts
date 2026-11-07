export const selectSpeedTier = (tiers: readonly number[], speed: number): number | null => {
  const sorted = tiers.filter(tier => tier >= 0).sort((a, b) => a - b)
  return sorted.find(tier => tier >= Math.max(0, speed)) ?? sorted.at(-1) ?? null
}

export const advanceCycleTime = (time: number, delta: number, speed: number, duration: number): number => {
  const next = time + delta * 1000 * (speed > 0 ? speed : 1)
  return duration > 0 ? next % duration : next
}
