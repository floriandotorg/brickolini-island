import * as THREE from 'three'
import type { Roi3D } from '../../assets/model'
import { Act3Ammo } from '../act3/ammo'
import { PathActor } from './path-actor'

export class Act3Actor extends PathActor {
  public actorState: 'initial' | 'hit' | 'hitAnimation' | 'disabled' = 'initial'
  protected _time = 0
  private _knockEnd = 0
  private _knockQuaternion = new THREE.Quaternion()
  public knockUp(): void {
    if (this.actorState !== 'initial') {
      return
    }
    this._knockQuaternion.copy(this.roi.getWorldQuaternion(new THREE.Quaternion()))
    this.roi.moveRoiTo(this.roi.position.clone().add(new THREE.Vector3(0, 5, 0)))
    this.actorState = 'hit'
  }
  public override get collisionEnabled(): boolean {
    return super.collisionEnabled && this.actorState === 'initial'
  }
  public override onCollision(roi: Roi3D | null, mover = false): void {
    if (mover && roi?.actor instanceof Act3Actor) {
      roi.actor.knockUp()
    } else if (mover && roi?.actor instanceof Act3Ammo) {
      roi.actor.knockUp()
    }
  }
  protected stepState(delta: number): boolean {
    if (this.actorState === 'disabled') {
      return false
    }
    this._time += delta * 1000
    if (this.actorState === 'hit') {
      this._knockEnd = this._time + 2000
      this.actorState = 'hitAnimation'
      return false
    }
    if (this.actorState === 'hitAnimation') {
      if (this._time < this._knockEnd) {
        this.roi.moveRoiTo(this.roi.position, this.roi.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.6 * delta * 60)))
      } else {
        this.roi.moveRoiTo(this.roi.position.clone().add(new THREE.Vector3(0, -5, 0)), this._knockQuaternion)
        this.actorState = 'initial'
      }
      return false
    }
    return true
  }
  protected stationary(): { from: THREE.Vector3; to: THREE.Vector3 } {
    return { from: this.roi.position.clone(), to: this.roi.position.clone() }
  }
  protected move(delta: number) {
    return super.update(delta)
  }
  public override update(delta: number): { from: THREE.Vector3; to: THREE.Vector3 } {
    if (!this.stepState(delta)) {
      return this.stationary()
    }
    return this.move(delta)
  }
}
