import type { Roi3D } from '../../assets/model'
import { Actor } from '../actor'

export class Act2Gen extends Actor {
  public override onCollision(_roi: Roi3D | null): void {
    if (_roi != null) {
      return
    }
    console.log('Act2Gen collision')
    void this._isle.playPositionalAudio('hitactor', this.roi.model)
  }
}
