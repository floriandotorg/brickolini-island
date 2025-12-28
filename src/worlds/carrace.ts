import * as THREE from 'three'
import { engine } from '../lib/engine'
import { getSettings } from '../lib/settings'
import { IsleBase } from './isle-base'

const EPSILON = 0.0001
const MAX_ROT_VEL = 80
const MAX_LINEAR_ACCEL = 10
const MAX_ROT_ACCEL = 30
const MAX_LINEAR_DECEL = 50
const MAX_ROT_DECEL = 5
const CAM_HEIGHT = 1.25

export class CarRace extends IsleBase {
  constructor() {
    super('carrace', 'RACC')
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
    for (let n = 0; n < MAX_ITERATIONS && remaining.length() > EPSILON; ++n) {
      const dir = remaining.clone().normalize()
      const ray = new THREE.Raycaster(pos, dir, 0, remaining.length() + COLLISION_BUFFER)
      const hit = getSettings().freeRoam && this._isleMesh != null ? ray.intersectObject(this._isleMesh)[0] : ray.intersectObject(this._boundaryManager.walls)[0]
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

  protected override get debugPositionDirection(): { position: THREE.Vector3; direction: THREE.Vector3; slewMode: boolean } | null {
    return { position: this.camera.position, direction: new THREE.Vector3(0, 0, 1).applyEuler(this.camera.rotation), slewMode: this._slewMode }
  }

  private _calculateSlopeTilt(): number {
    const downRay = new THREE.Raycaster(this.camera.position.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, -1, 0), 0, 10)
    const hit = downRay.intersectObjects(this._groundGroup)[0]

    if (hit?.face != null) {
      const worldNormal = hit.face.normal.clone()
      worldNormal.transformDirection(hit.object.matrixWorld)

      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion)
      forward.y = 0
      forward.normalize()

      const slopeAngle = Math.atan2(worldNormal.dot(forward), worldNormal.y)

      return -slopeAngle
    }

    return 0
  }

  private _getGroundPosition(position: THREE.Vector3, offset = new THREE.Vector3(0, CAM_HEIGHT, 0)): THREE.Vector3 {
    const downRay = new THREE.Raycaster(position.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, -1, 0), 0, 1000)
    const hit = downRay.intersectObjects(this._groundGroup)[0]
    if (hit) {
      return hit.point.clone().add(offset)
    }
    throw new Error('No ground hit')
  }

  private _placeObjectOnGround(object: THREE.Object3D, offset = new THREE.Vector3(0, CAM_HEIGHT, 0)): void {
    object.position.copy(this._getGroundPosition(object.position, offset))
  }

  public override keyPressed(key: string): void {
    super.keyPressed(key)

    if (key === 'f' && import.meta.env.DEV) {
      this._slewMode = !this._slewMode

      if (!this._slewMode) {
        this._linearVel = 0
        this._rotVel = 0
        this._verticalVel = 0
        this._pitchVel = 0
        this.camera.position.y = 100
        this._placeObjectOnGround(this.camera)
      }
    }

    if (key === 'm') {
      engine.currentSaveGame.nextSunPosition()
      this._updateSun()
    }
  }

  public override update(delta: number): void {
    super.update(delta)

    if (this._water != null) {
      this._water.material.uniforms.time.value += delta * 0.1
    }

    if (this.isRunningCameraAnimation) {
      return
    }

    const speedMultiplier = this._slewMode ? 4 : 1

    const maxLinearVel = 6

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
    this._dashboard.update(vel / maxVelCurrent)

    this.camera.rotation.y += THREE.MathUtils.degToRad(this._rotVel * delta)
    if (this._slewMode) {
      this.camera.rotation.x += THREE.MathUtils.degToRad(this._pitchVel * delta)
      if (this.camera.rotation.x > Math.PI / 2) {
        this.camera.rotation.x = Math.PI / 2
      }
      if (this.camera.rotation.x < -Math.PI / 2) {
        this.camera.rotation.x = -Math.PI / 2
      }
    } else {
      this.camera.rotation.x = this._calculateSlopeTilt()
    }
    this.camera.rotation.z = 0

    const forward = new THREE.Vector3()
    this.camera.getWorldDirection(forward)
    if (this._slewMode) {
      forward.y = 0
      forward.normalize()
    }

    const moveVec = forward.clone().multiplyScalar(this._linearVel * delta)
    moveVec.y += this._verticalVel * delta
    if (moveVec.length() > 0) {
      if (this._slewMode) {
        this.camera.position.add(moveVec)
      } else {
        const slideMove = this._collideAndSlide(this.camera.position, moveVec)
        if (slideMove.length() > EPSILON) {
          this.camera.position.add(slideMove)
        }
      }
    }
  }
}
