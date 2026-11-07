export type TransitionType = 'none' | 'dissolve' | 'mosaic' | 'wipeDown' | 'windows'
export type TransitionOptions = { type?: TransitionType; speedMs?: number; keepMusic?: boolean }

export class Transition {
  public readonly type: TransitionType
  public readonly speedMs: number
  public readonly order: number[]
  public readonly shifts: number[]
  public ticks = 0
  public readonly totalTicks: number

  public constructor({ type = 'mosaic', speedMs = 50 }: TransitionOptions = {}) {
    if (!Number.isFinite(speedMs) || speedMs <= 0) {
      throw new Error('Transition speed must be positive')
    }
    this.type = type
    this.speedMs = speedMs
    this.totalTicks = type === 'mosaic' ? 16 : type === 'dissolve' ? 40 : type === 'none' ? 1 : 240
    const columns = type === 'dissolve' ? 640 : 64
    this.order = Array.from({ length: columns }, (_, n) => n)
    for (let n = columns - 1; n > 0; --n) {
      const other = Math.floor(Math.random() * (n + 1))
      const value = this.order[n]
      this.order[n] = this.order[other]
      this.order[other] = value
    }
    this.shifts = Array.from({ length: type === 'dissolve' ? 480 : 48 }, () => Math.floor(Math.random() * columns))
  }

  public update(elapsedMs: number): boolean {
    this.ticks = Math.min(this.totalTicks, Math.floor(elapsedMs / this.speedMs))
    return this.ticks === this.totalTicks
  }
}
