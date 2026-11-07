export const walkingBehavior = (maximum: number, mode: number, random = Math.random()): { clockwise: boolean; index: number } => ({ clockwise: mode === 2, index: mode === 0 ? Math.floor(random * Math.max(1, maximum)) + 1 : 1 })
export const pathFraction = (current: number, delta: number, speed: number, chord: number): number => Math.min(1, current + (delta * speed) / Math.max(0.001, chord))
export const tumbleAxis = (x: number, z: number): [number, number, number] => (Math.abs(z) < Math.abs(x) ? [0, 0, x > 0 ? 1 : -1] : [z > 0 ? 1 : -1, 0, 0])
