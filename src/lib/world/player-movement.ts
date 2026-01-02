import * as THREE from 'three'
import { engine } from '../engine'
import { getSettings } from '../settings'
import type { VehicleType } from './dashboard'

const CAM_HEIGHT = 1.25
const MAX_ROT_VEL = 80
const MAX_LINEAR_ACCEL = 10
const MAX_ROT_ACCEL = 30
const MAX_LINEAR_DECEL = 50
const MAX_ROT_DECEL = 50
const EPSILON = 0.0001

const VEHICLE_MAX_LINEAR_VEL: Record<VehicleType, number> = {
  ambul: 40,
  bike: 20,
  dunecar: 25,
  helicopter: 60,
  jetski: 25,
  moto: 40,
  racecar: 40,
  skate: 15,
  towtk: 40,
}

const WALK_SPEED = 6

export class PlayerMovement {
  private _linearVel = 0
  private _rotVel = 0
  private _verticalVel = 0
  private _pitchVel = 0
  private _slewMode = false

  constructor(
    private readonly _camera: THREE.PerspectiveCamera,
    private readonly _groundGroup: THREE.Object3D[],
    private readonly _getBoundaryWalls: () => THREE.Object3D,
    private readonly _getIsleMesh: () => THREE.Object3D | null,
  ) {}

  get slewMode(): boolean {
    return this._slewMode
  }

  set slewMode(value: boolean) {
    this._slewMode = value
  }

  get linearVelocity(): number {
    return this._linearVel
  }

  resetVelocities(): void {
    this._linearVel = 0
    this._rotVel = 0
    this._verticalVel = 0
    this._pitchVel = 0
  }

  toggleSlewMode(): void {
    this._slewMode = !this._slewMode

    if (!this._slewMode) {
      this.resetVelocities()
      this._camera.position.y = 100
      this.placeOnGround(this._camera)
    }
  }

  private _calculateNewVel(targetVel: number, currentVel: number, accel: number, delta: number): number {
    let newVel = currentVel
    const velDiff = targetVel - currentVel
    if (Math.abs(velDiff) > EPSILON) {
      const vSign = velDiff > 0 ? 1 : -1
      const deltaVel = accel * delta
      newVel = currentVel + deltaVel * vSign
      newVel = vSign > 0 ? Math.min(newVel, targetVel) : Math.max(newVel, targetVel)
    }
    return newVel
  }

  private _collideAndSlide(startPos: THREE.Vector3, moveVec: THREE.Vector3): THREE.Vector3 {
    const totalMove = new THREE.Vector3()
    const remaining = moveVec.clone()
    const pos = startPos.clone()
    const MAX_ITERATIONS = 5
    const COLLISION_BUFFER = 0.5
    const isleMesh = this._getIsleMesh()

    for (let n = 0; n < MAX_ITERATIONS && remaining.length() > EPSILON; ++n) {
      const dir = remaining.clone().normalize()
      const ray = new THREE.Raycaster(pos, dir, 0, remaining.length() + COLLISION_BUFFER)
      const hit = getSettings().freeRoam && isleMesh != null ? ray.intersectObject(isleMesh)[0] : ray.intersectObject(this._getBoundaryWalls())[0]

      if (!hit) {
        totalMove.add(remaining)
        break
      }

      const dist = Math.max(hit.distance - COLLISION_BUFFER, 0)
      const moveAllowed = dir.clone().multiplyScalar(dist)
      totalMove.add(moveAllowed)
      pos.add(moveAllowed)

      const m3 = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)
      const normal = hit.face?.normal.clone().applyMatrix3(m3).normalize() ?? new THREE.Vector3()

      remaining.sub(moveAllowed)
      const projection = remaining.clone().sub(normal.multiplyScalar(remaining.dot(normal)))
      remaining.copy(projection)
    }

    return totalMove
  }

  private _calculateSlopeTilt(): number {
    const downRay = new THREE.Raycaster(this._camera.position.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, -1, 0), 0, 10)
    const hit = downRay.intersectObjects(this._groundGroup)[0]

    if (hit?.face != null) {
      const worldNormal = hit.face.normal.clone()
      worldNormal.transformDirection(hit.object.matrixWorld)

      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this._camera.quaternion)
      forward.y = 0
      forward.normalize()

      const slopeAngle = Math.atan2(worldNormal.dot(forward), worldNormal.y)
      return -slopeAngle
    }

    return 0
  }

  getGroundPosition(position: THREE.Vector3, offset = new THREE.Vector3(0, CAM_HEIGHT, 0)): THREE.Vector3 {
    const downRay = new THREE.Raycaster(position.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, -1, 0), 0, 1000)
    const hit = downRay.intersectObjects(this._groundGroup)[0]
    if (hit) {
      return hit.point.clone().add(offset)
    }
    throw new Error('No ground hit')
  }

  placeOnGround(object: THREE.Object3D, offset = new THREE.Vector3(0, CAM_HEIGHT, 0)): void {
    object.position.copy(this.getGroundPosition(object.position, offset))
  }

  getDebugInfo(): { position: THREE.Vector3; direction: THREE.Vector3; slewMode: boolean } {
    return {
      position: this._camera.position,
      direction: new THREE.Vector3(0, 0, 1).applyEuler(this._camera.rotation),
      slewMode: this._slewMode,
    }
  }

  update(delta: number, vehicleType: VehicleType | null): { fromPos: THREE.Vector3; toPos: THREE.Vector3; normalizedSpeed: number } {
    const speedMultiplier = this._slewMode ? 4 : 1
    const maxLinearVel = vehicleType != null ? VEHICLE_MAX_LINEAR_VEL[vehicleType] : WALK_SPEED

    const targetLinearVel = (engine.isKeyDown('ArrowUp') ? maxLinearVel : engine.isKeyDown('ArrowDown') ? -maxLinearVel : 0) * speedMultiplier
    const targetRotVel = engine.isKeyDown('ArrowLeft') ? MAX_ROT_VEL : engine.isKeyDown('ArrowRight') ? -MAX_ROT_VEL : 0
    const targetVerticalVel = this._slewMode ? (engine.isKeyDown('q') ? maxLinearVel * speedMultiplier : engine.isKeyDown('e') ? -maxLinearVel * speedMultiplier : 0) : 0
    const targetPitchVel = this._slewMode ? (engine.isKeyDown('w') ? MAX_ROT_VEL : engine.isKeyDown('s') ? -MAX_ROT_VEL : 0) : 0

    const linearAccel = targetLinearVel !== 0 ? MAX_LINEAR_ACCEL : MAX_LINEAR_DECEL
    const rotAccel = (targetRotVel !== 0 ? MAX_ROT_ACCEL : MAX_ROT_DECEL) * 40
    const pitchAccel = (targetPitchVel !== 0 ? MAX_ROT_ACCEL : MAX_ROT_DECEL) * 40

    if (this._slewMode) {
      this._linearVel = targetLinearVel
      this._rotVel = targetRotVel
      this._verticalVel = targetVerticalVel
      this._pitchVel = targetPitchVel
    } else {
      this._linearVel = this._calculateNewVel(targetLinearVel, this._linearVel, linearAccel, delta)
      this._rotVel = this._calculateNewVel(targetRotVel, this._rotVel, rotAccel, delta)
      this._verticalVel = this._calculateNewVel(targetVerticalVel, this._verticalVel, linearAccel, delta)
      this._pitchVel = this._calculateNewVel(targetPitchVel, this._pitchVel, pitchAccel, delta)
    }

    const vel = this._linearVel < 0 ? -this._linearVel : this._linearVel
    const maxVelCurrent = maxLinearVel * (this._slewMode ? 4 : 1)
    const normalizedSpeed = vel / maxVelCurrent

    this._camera.rotation.y += THREE.MathUtils.degToRad(this._rotVel * delta)

    if (this._slewMode) {
      this._camera.rotation.x += THREE.MathUtils.degToRad(this._pitchVel * delta)
      if (this._camera.rotation.x > Math.PI / 2) {
        this._camera.rotation.x = Math.PI / 2
      }
      if (this._camera.rotation.x < -Math.PI / 2) {
        this._camera.rotation.x = -Math.PI / 2
      }
    } else {
      this._camera.rotation.x = this._calculateSlopeTilt()
    }
    this._camera.rotation.z = 0

    const forward = new THREE.Vector3()
    this._camera.getWorldDirection(forward)
    if (this._slewMode) {
      forward.y = 0
      forward.normalize()
    }

    const fromPos = this._camera.position.clone()
    let toPos = fromPos.clone()
    const moveVec = forward.clone().multiplyScalar(this._linearVel * delta)
    moveVec.y += this._verticalVel * delta

    if (moveVec.length() > 0) {
      if (this._slewMode) {
        this._camera.position.add(moveVec)
      } else {
        const slideMove = this._collideAndSlide(this._camera.position, moveVec)
        if (slideMove.length() > EPSILON) {
          this._camera.position.add(slideMove)
          toPos = this._camera.position.clone()
        }
      }
    }

    if (!this._slewMode) {
      this.placeOnGround(this._camera)
    }

    return { fromPos, toPos, normalizedSpeed }
  }
}
