import * as THREE from 'three'
import { Actor } from '../actor'

export class RaceSkel extends Actor {
  private _animation = false

  public override update(delta: number): { from: THREE.Vector3; to: THREE.Vector3 } {
    const result = super.update(delta)

    if (!this._animation) {
      this._animation = true
      const animationAction = this._animationActions.get(0)
      if (animationAction == null) {
        throw new Error('Animation not found')
      }
      void this._isle.playAnimation(animationAction, {
        location: new THREE.Vector3(630, -4.688, 323),
      })
    }

    return result
  }
}
