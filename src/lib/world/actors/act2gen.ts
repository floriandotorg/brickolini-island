import type { Roi3D } from '../../assets/model'
import { engine } from '../../engine'
import { Actor } from '../actor'

let lastHit = Number.NEGATIVE_INFINITY

export class Act2Gen extends Actor {
  public override onCollision(_roi: Roi3D | null): void {
    if (_roi != null) {
      return
    }
    const now = engine.elapsedTimeMilliseconds
    if (now - lastHit > 1000) {
      void this._isle.playPositionalAudio('hitactor', this.roi.model)
    }
    lastHit = now
  }
}
