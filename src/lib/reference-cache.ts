type Entry<T> = { references: number; promise: Promise<T>; value?: T }
export class ReferenceCache<K, T> {
  private readonly _entries = new Map<K, Entry<T>>()
  private readonly _load: (key: K) => Promise<T>
  private readonly _attach: (value: T) => void
  private readonly _dispose: (value: T) => void
  constructor(load: (key: K) => Promise<T>, attach: (value: T) => void, dispose: (value: T) => void) {
    this._load = load
    this._attach = attach
    this._dispose = dispose
  }
  public acquire(key: K): Promise<T> {
    const existing = this._entries.get(key)
    if (existing != null) {
      ++existing.references
      return existing.promise
    }
    const entry: Entry<T> = {
      references: 1,
      promise: Promise.resolve()
        .then(() => this._load(key))
        .then(value => {
          entry.value = value
          if (this._entries.get(key) === entry) {
            this._attach(value)
          } else {
            this._dispose(value)
          }
          return value
        })
        .catch(error => {
          if (this._entries.get(key) === entry) {
            this._entries.delete(key)
          }
          throw error
        }),
    }
    this._entries.set(key, entry)
    return entry.promise
  }
  public has(key: K): boolean {
    return this._entries.has(key)
  }
  public refCount(key: K): number {
    return this._entries.get(key)?.references ?? 0
  }
  public release(key: K): void {
    const entry = this._entries.get(key)
    if (entry == null) {
      return
    }
    if (--entry.references <= 0) {
      this._entries.delete(key)
      if (entry.value !== undefined) {
        this._dispose(entry.value)
      }
    }
  }
  public clear(): void {
    for (const entry of this._entries.values()) {
      if (entry.value !== undefined) {
        this._dispose(entry.value)
      }
    }
    this._entries.clear()
  }
}
