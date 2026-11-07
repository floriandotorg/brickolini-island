export const volumeToGain = (volume: number): number => (volume <= 0 ? 0 : (Math.min(volume, 100) / 100) ** 1.661)

export const distanceVolume = (distanceSquared: number): number => (distanceSquared < 100 ? 1 : distanceSquared < 400 ? 0.4 : distanceSquared < 3600 ? 0.1 : 0)
