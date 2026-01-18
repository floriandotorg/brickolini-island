import * as THREE from 'three'
import type { Roi3D } from '../../assets/model'
import { Actor } from '../actor'

export class Door extends Actor {
  private _isOpen = false
  private _animationProgress = 0
  private _targetProgress = 0
  private _originalQuaternion: THREE.Quaternion

  constructor(roi: Roi3D) {
    super(roi)
    this._originalQuaternion = roi.quaternion.clone()
  }

  public get isOpen(): boolean {
    return this._isOpen
  }

  public open(): void {
    this._isOpen = true
    this._targetProgress = 1
  }

  public close(): void {
    this._isOpen = false
    this._targetProgress = 0
  }

  public toggle(): void {
    if (this._isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  public override update(delta: number): void {
    const speed = 2
    if (this._animationProgress < this._targetProgress) {
      this._animationProgress = Math.min(this._targetProgress, this._animationProgress + delta * speed)
    } else if (this._animationProgress > this._targetProgress) {
      this._animationProgress = Math.max(this._targetProgress, this._animationProgress - delta * speed)
    }

    const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (this._animationProgress * Math.PI) / 2)
    this._roi.quaternion.copy(this._originalQuaternion).multiply(rotation)
  }

  public override onCollision(_from: THREE.Vector3, _to: THREE.Vector3): void {
    console.log('Door collision detected!')
    this.toggle()
  }
}
