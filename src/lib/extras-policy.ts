export const allowedExtraLifetime = (count: number): number => Math.trunc(((count - 2) * 280000) / 18) + 20000

export const initialExtraLocations = (random: () => number = Math.random): number[] => {
  const remaining = Array.from({ length: 10 }, (_, n) => n + 1)
  return Array.from({ length: 5 }, () => remaining.splice(Math.floor(random() * 5), 1)[0])
}

export const extraCycleIndices = (mood: number): [number, number, number] => {
  const fast = mood >= 2 ? mood - 1 : mood
  return [mood, fast + 4, Math.max(0, fast - 1) + 7]
}

export const nextExtraPopulation = (count: number, maximum: number, smoothed: number, frameTime: number): { count: number; smoothed: number } => {
  if (frameTime > 0.01 && frameTime < 1) {
    smoothed = (smoothed * 2 + frameTime) / 3
  }
  if (frameTime > 0.2 && count > 2) {
    --count
  } else if (smoothed < 0.16 && count < maximum) {
    ++count
  }
  return { count, smoothed }
}
