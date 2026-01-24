import * as THREE from 'three'
import type { Roi3D, RoiModel } from '../../assets/model'
import { engine } from '../../engine'
import { Actor } from '../actor'

// type Closed = {
//   readonly state: 'closed'
// }

// type MovingToState = {
//   readonly state: 'opening' | 'closing'
//   readonly time: number
//   readonly next: States
// }

// type States = Closed | MovingToState

// const IdleState: Idle = { state: 'idle' }
// const ShelfMovingState: ShelfMoving = { state: 'shelfMoving' }

export class Door extends Actor {
  private _lastHit: number | null = null
  private readonly _leftDoor: { model: RoiModel; originalQuaternion: THREE.Quaternion }
  private readonly _rightDoor: { model: RoiModel; originalQuaternion: THREE.Quaternion }

  constructor(roi: Roi3D) {
    super(roi)
    let leftDoor = null
    let rightDoor = null
    for (const child of roi.children) {
      if (child.name.startsWith('dor-lt') || child.name.startsWith('dor-sl')) {
        leftDoor = child.model
      } else if (child.name.startsWith('dor-rt') || child.name.startsWith('dor-sr')) {
        rightDoor = child.model
      }
    }
    if (leftDoor == null) {
      throw new Error('No left door found')
    }
    if (rightDoor == null) {
      throw new Error('No right door found')
    }
    this._leftDoor = { model: leftDoor, originalQuaternion: leftDoor.quaternion.clone() }
    this._rightDoor = { model: rightDoor, originalQuaternion: rightDoor.quaternion.clone() }
  }

  // TODO: Major (!) refactor to be done here, works for now...
  private getAngle(): number {
    if (this._lastHit != null) {
      const timeSinceHit = engine.elapsedTimeSeconds - this._lastHit
      if (timeSinceHit >= 0 && timeSinceHit <= 1) {
        return timeSinceHit
      }
      if (timeSinceHit >= 5 && timeSinceHit <= 6) {
        return 6 - timeSinceHit
      }
      if (timeSinceHit > 6) {
        this._lastHit = null
        return 0
      }
      return 1
    }
    return 0
  }

  public get isOpen(): boolean {
    return this.getAngle() > 0
  }

  public override update(_: number): void {
    const angle = this.getAngle()
    const tempQ = new THREE.Quaternion()
    tempQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (angle * Math.PI) / 2)
    this._leftDoor.model.quaternion.copy(this._leftDoor.originalQuaternion).multiply(tempQ)
    tempQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (-angle * Math.PI) / 2)
    this._rightDoor.model.quaternion.copy(this._rightDoor.originalQuaternion).multiply(tempQ)
  }

  public override onCollision(_from: THREE.Vector3, _to: THREE.Vector3): void {
    if (this._lastHit == null) {
      this._lastHit = engine.elapsedTimeSeconds
    }
  }
}
