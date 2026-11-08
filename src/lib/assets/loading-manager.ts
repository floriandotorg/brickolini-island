import * as THREE from 'three'

export class AssetLoadingManager extends THREE.LoadingManager {
  private _pending = 0
  private readonly _waiters = new Set<() => void>()

  public constructor() {
    super()
    const start = this.itemStart
    const end = this.itemEnd
    this.itemStart = url => {
      ++this._pending
      start(url)
    }
    this.itemEnd = url => {
      try {
        end(url)
      } finally {
        --this._pending
        if (this._pending === 0) {
          for (const resolve of this._waiters) {
            resolve()
          }
          this._waiters.clear()
        }
      }
    }
  }

  public async whenIdle(): Promise<void> {
    while (this._pending > 0) {
      await new Promise<void>(resolve => this._waiters.add(resolve))
    }
  }
}
