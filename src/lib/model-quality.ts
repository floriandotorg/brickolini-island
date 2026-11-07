type Quality = 'low' | 'medium' | 'high'
export const lodIndex = (count: number, maximum: number | null, quality: Quality): number => Math.max(0, Math.min(count - 1, Math.floor(maximum ?? (quality === 'low' ? 1 : quality === 'medium' ? 2 : 100))))
export const islandModelName = (names: readonly string[], quality: Quality): string | undefined => {
  const selected = quality === 'low' ? 'isle_lo' : quality === 'medium' ? 'isle' : 'isle_hi'
  return names.find(name => name.toLowerCase() === selected) ?? (quality === 'low' ? names.find(name => name.toLowerCase() === 'isle') : undefined) ?? names.find(name => name.toLowerCase() === 'isle_hi') ?? names.find(name => ['isle', 'isle_lo'].includes(name.toLowerCase()))
}
