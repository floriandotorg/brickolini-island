export type SoundMode = 'replace' | 'queue' | 'onlyIfEmpty'
type Entry<T> = { action: T; mode: SoundMode; started: boolean }
export class SoundQueue<T> {
  private _entries: Entry<T>[] = []
  private _cleared = false
  private readonly _start: (action: T) => void
  private readonly _stop: (action: T) => void
  constructor(start: (action: T) => void, stop: (action: T) => void) {
    this._start = start
    this._stop = stop
  }
  public insert(action: T, mode: SoundMode): void {
    if (this._cleared || (mode === 'onlyIfEmpty' && this._entries.length > 0)) {
      return
    }
    const previous = this._entries.findLast(entry => entry.started)
    const entry = { action, mode, started: this._entries.length === 0 }
    this._entries.push(entry)
    if (entry.started) {
      this._start(action)
    } else if (mode === 'replace' && previous != null) {
      this._stop(previous.action)
    }
  }
  public onEnded(action: T): void {
    const index = this._entries.findIndex(entry => entry.started && entry.action === action)
    if (this._cleared || index < 0) {
      return
    }
    this._entries.splice(index, 1)
    this.advance()
  }
  public removeFirst(): void {
    if (this._entries.length > 0) {
      this._entries.shift()
      this.advance()
    }
  }
  private advance(): void {
    const replacement = this._entries.findLastIndex(entry => entry.mode === 'replace')
    if (replacement > 0) {
      const started = this._entries.slice(0, replacement).find(entry => entry.started)
      if (started != null) {
        this._stop(started.action)
        return
      }
      this._entries.splice(0, replacement)
    }
    const next = this._entries[0]
    if (next != null && !next.started) {
      next.started = true
      this._start(next.action)
    }
  }
  public suspend(): void {
    for (const entry of this._entries) {
      if (entry.started) {
        entry.started = false
        this._stop(entry.action)
      }
    }
  }
  public resume(): void {
    if (!this._cleared) {
      this.advance()
    }
  }
  public clear(): void {
    this._cleared = true
    const entries = this._entries
    this._entries = []
    for (const entry of entries) {
      if (entry.started) {
        this._stop(entry.action)
      }
    }
  }
}
