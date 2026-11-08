import { type PerspectiveCamera, Quaternion, type Vector3 } from 'three'
import type { InputPoint } from '../input.ts'

export const planarMovement = (direction: Vector3, up: Vector3, forwardSpeed: number, strafeSpeed: number, maximumSpeed: number): Vector3 => {
  const forward = direction.clone().projectOnPlane(up).normalize()
  const right = forward.clone().cross(up).normalize()
  return forward.multiplyScalar(forwardSpeed).addScaledVector(right, strafeSpeed).clampLength(0, maximumSpeed)
}

export class MouseLook {
  private _pitch = 0
  private _appliedPitch = 0
  private _rotation = new Quaternion()

  public begin = (camera: PerspectiveCamera, movement: InputPoint, enabled: boolean): void => {
    if (this._appliedPitch !== 0) {
      if (camera.quaternion.equals(this._rotation)) {
        camera.rotateX(-this._appliedPitch)
      } else {
        this._pitch = 0
      }
      this._appliedPitch = 0
    }
    if (!enabled) {
      this._pitch = 0
      return
    }
    camera.rotateY(-movement.x * 0.002)
    this._pitch = Math.max(-Math.PI * (4 / 9), Math.min(Math.PI * (4 / 9), this._pitch - movement.y * 0.002))
  }

  public apply = (camera: PerspectiveCamera): void => {
    camera.rotateX(this._pitch)
    this._appliedPitch = this._pitch
    this._rotation.copy(camera.quaternion)
  }
}
