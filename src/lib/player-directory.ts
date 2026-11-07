export class PlayerDirectory {
  private _names: string[] = []
  private readonly _storage: Pick<Storage, 'getItem' | 'setItem'>
  private readonly _deleteSave: (name: string) => void

  constructor(storage: Pick<Storage, 'getItem' | 'setItem'>, deleteSave: (name: string) => void) {
    this._storage = storage
    this._deleteSave = deleteSave
    try {
      const value: unknown = JSON.parse(storage.getItem('saves') ?? '[]')
      if (Array.isArray(value)) {
        this._names = [...new Set(value.filter((name): name is string => typeof name === 'string' && /^[A-Z0-9]+$/i.test(name)).map(name => name.toUpperCase()))].slice(0, 9)
      }
    } catch {
      this._names = []
    }
  }

  public get names(): readonly string[] {
    return [...this._names]
  }

  public find = (name: string): number => this._names.indexOf(name.toUpperCase())

  public select = (index: number): void => {
    if (!Number.isInteger(index) || index < 0 || index >= this._names.length) {
      throw new Error('Unknown player index')
    }
    const [name] = this._names.splice(index, 1)
    this._names.unshift(name)
    this.store()
  }

  public add = (name: string): void => {
    if (!/^[A-Z0-9]+$/i.test(name)) {
      throw new Error('Name must be alphanumeric')
    }
    const index = this.find(name)
    if (index >= 0) {
      this.select(index)
      return
    }
    if (this._names.length === 9) {
      const oldest = this._names.pop()
      if (oldest != null) {
        this._deleteSave(oldest)
      }
    }
    this._names.unshift(name.toUpperCase())
    this.store()
  }

  public importNames = (names: readonly string[]): void => {
    if (!names.every(name => /^[A-Z]{1,7}$/.test(name))) {
      throw new Error('Invalid imported player name')
    }
    const merged = [...new Set([...names, ...this._names])].slice(0, 9)
    this._storage.setItem('saves', JSON.stringify(merged))
    this._names = merged
  }

  public store = (): void => this._storage.setItem('saves', JSON.stringify(this._names))
}
