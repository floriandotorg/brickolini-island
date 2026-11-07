type PendingAction = { siFile: string; id: number; managed: boolean; cancelled: boolean }

export class PendingActions {
  private readonly _entries = new Set<PendingAction>()

  public begin = (siFile: string, id: number, managed: boolean): PendingAction => {
    const entry = { siFile, id, managed, cancelled: false }
    this._entries.add(entry)
    return entry
  }

  public finish = (entry: PendingAction): void => {
    this._entries.delete(entry)
  }

  public stopRange = (siFile: string, first: number, last: number): void => {
    for (const entry of this._entries) {
      if (entry.siFile === siFile && entry.id >= first && entry.id <= last) {
        entry.cancelled = true
      }
    }
  }

  public stopManaged = (): void => {
    for (const entry of this._entries) {
      if (entry.managed) {
        entry.cancelled = true
      }
    }
  }

  public stopAll = (): void => {
    for (const entry of this._entries) {
      entry.cancelled = true
    }
  }
}
