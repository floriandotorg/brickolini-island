import * as THREE from 'three'
import type { Boundary } from '../assets/boundary'
import { engine } from '../engine'
import { updateRaycastMatrices } from '../matrix-cache.ts'
import { getSettings } from '../settings'
import type { BoundaryManager } from './boundary-manager'
import type { VehicleType } from './dashboard'
import { MouseLook, planarMovement } from './mouse-navigation.ts'
import { NAV_REFERENCE_TICK_HZ, NavController } from './nav-controller.ts'

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
  public readonly navigation = new NavController()
  public get accelerationMultiplier(): number {
    return this.navigation.accelerationMultiplier
  }
  public set accelerationMultiplier(value: number) {
    this.navigation.accelerationMultiplier = value
  }
  public boundaryManager: BoundaryManager | null = null
  public canMove: (from: THREE.Vector3, to: THREE.Vector3) => boolean = () => true
  private _boundary: Boundary | null = null
  private _linearVel = 0
  private _strafeVel = 0
  private readonly _mouseLook = new MouseLook()
  private _rotVel = 0
  private _verticalVel = 0
  private _pitchVel = 0
  private _externalVelocity = new THREE.Vector3()
  private _lookYaw = 0
  private _slewMode = false
  private _flightMode = false
  public flightInfo: {
    takeOff: { position: THREE.Vector3; quaternion: THREE.Quaternion }
    land: { position: THREE.Vector3; quaternion: THREE.Quaternion }
  } | null = null

  private readonly _camera: THREE.PerspectiveCamera
  private readonly _groundGroup: THREE.Object3D[]
  private readonly _getBoundaryWalls: () => THREE.Object3D
  private readonly _getIsleMesh: () => THREE.Object3D | null

  constructor(camera: THREE.PerspectiveCamera, groundGroup: THREE.Object3D[], getBoundaryWalls: () => THREE.Object3D, getIsleMesh: () => THREE.Object3D | null) {
    this._camera = camera
    this._groundGroup = groundGroup
    this._getBoundaryWalls = getBoundaryWalls
    this._getIsleMesh = getIsleMesh
  }

  get slewMode(): boolean {
    return this._slewMode
  }

  set slewMode(value: boolean) {
    this._slewMode = value
  }

  get flightMode(): boolean {
    return this._flightMode
  }

  set flightMode(value: boolean) {
    if (this.flightInfo == null) {
      throw new Error('Unable to enter flight mode without flight position defined')
    }
    const { position, quaternion } = value ? this.flightInfo.takeOff : this.flightInfo.land

    this._camera.position.copy(position).add(new THREE.Vector3(0, value ? 0 : CAM_HEIGHT, 0))
    this._camera.quaternion.copy(quaternion)
    this.resetVelocities()
    this._flightMode = value
  }

  set linearVelocity(value: number) {
    this._linearVel = value
    this.navigation.linearVelocity = value
  }

  get linearVelocity(): number {
    return this._linearVel
  }

  get turn(): number {
    return this._linearVel > 0 ? (this.navigation.rotationalVelocity / 20) * Math.min(1, this._linearVel / this.navigation.maximumSpeed) : 0
  }

  resetVelocities(): void {
    this.navigation.reset()
    this._externalVelocity.set(0, 0, 0)
    this._boundary = null
    this._linearVel = 0
    this._strafeVel = 0
    this._rotVel = 0
    this._verticalVel = 0
    this._pitchVel = 0
  }

  public applyExternalVelocity(velocity: THREE.Vector3): void {
    this._externalVelocity.add(velocity)
  }

  public constrainDisplacement(position: THREE.Vector3, displacement: THREE.Vector3): THREE.Vector3 {
    const target = position.clone().add(displacement)
    const boundary = this.boundaryManager?.getBoundaryFromPosition(position)
    return boundary == null || boundary.isInside(target) ? target : position.clone()
  }

  toggleSlewMode(): void {
    this._slewMode = !this._slewMode

    if (!this._slewMode) {
      this.resetVelocities()
      const currentPos = this._camera.position.clone()
      const groundPos = this._tryGetGroundPosition(currentPos) ?? this._tryGetGroundPosition(currentPos.clone().setY(100))
      if (groundPos != null) {
        this._camera.position.copy(groundPos)
      }
    }
  }

  private _tryGetGroundPosition(position: THREE.Vector3, offset = new THREE.Vector3(0, CAM_HEIGHT, 0)): THREE.Vector3 | null {
    const downRay = new THREE.Raycaster(position.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, -1, 0), 0, 1000)
    updateRaycastMatrices(this._groundGroup)
    const hit = downRay.intersectObjects(this._groundGroup)[0]
    if (hit) {
      return hit.point.clone().add(offset)
    }
    return null
  }

  private _calculateNewVel = (targetVel: number, currentVel: number, accel: number, delta: number): number => {
    if (Math.abs(targetVel - currentVel) <= EPSILON) {
      return targetVel
    }
    return targetVel > currentVel ? Math.min(targetVel, currentVel + accel * delta) : Math.max(targetVel, currentVel - accel * delta)
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
    if (this._flightMode) {
      return -(Math.PI / 6)
    }

    const downRay = new THREE.Raycaster(this._camera.position.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, -1, 0), 0, 10)
    updateRaycastMatrices(this._groundGroup)
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
    updateRaycastMatrices(this._groundGroup)
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

  private navigateBoundary = (delta: number, vehicleType: VehicleType | null, normalizedSpeed: number): { fromPos: THREE.Vector3; toPos: THREE.Vector3; normalizedSpeed: number } | null => {
    if (this.boundaryManager == null || this._slewMode || getSettings().freeRoam) {
      return null
    }
    const fromPos = this._camera.position.clone()
    let boundary = this._boundary
    if (boundary == null || !boundary.isInside(fromPos) || Math.abs(boundary.normal.dot(fromPos) + boundary.up.w - (this._flightMode ? 0 : CAM_HEIGHT)) > 3) {
      boundary = this.boundaryManager.getBoundaryFromPosition(fromPos)
    }
    if (boundary == null) {
      return null
    }
    const oldUp = boundary.normal
    const offset = this._flightMode || engine.isPresenting ? 0 : CAM_HEIGHT
    const position = fromPos.clone().addScaledVector(oldUp, -offset)
    position.addScaledVector(oldUp, -(oldUp.dot(position) + boundary.up.w))
    const direction = (engine.isPresenting ? (engine.xrHeadCamera ?? this._camera) : this._camera).getWorldDirection(new THREE.Vector3()).projectOnPlane(oldUp).normalize()
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(this._rotVel * delta * (oldUp.y < 0 ? -1 : 1)))
    const displacement = engine.input.mouseWasd ? planarMovement(direction, oldUp, this._linearVel, this._strafeVel, this.navigation.maximumSpeed).multiplyScalar(delta) : direction.clone().multiplyScalar(this._linearVel * delta)
    let target = position.clone().add(displacement)
    const hit = boundary.intersect(position, target)
    if (hit != null) {
      const next = hit.edge.faceA === boundary ? hit.edge.faceB : hit.edge.faceA
      target = hit.point
      if (hit.edge.isTraversableFromFace(boundary) && next != null) {
        boundary = next
      } else {
        this.linearVelocity = this._linearVel * 0.8
        this._strafeVel *= 0.8
        const push = hit.point.clone().sub(engine.input.mouseWasd ? position.clone().add(displacement) : position.clone().addScaledVector(direction, this._linearVel * delta))
        if (push.lengthSq() > 1e-9) {
          direction.addScaledVector(push.normalize(), 0.01).normalize()
        }
      }
    }
    if (!this.canMove(position, target)) {
      target = position
    }
    const up = boundary.normal
    direction.projectOnPlane(up).normalize()
    const right = direction.clone().cross(up).normalize()
    const matrix = new THREE.Matrix4().makeBasis(right, up, direction.clone().negate())
    if (!engine.isPresenting) {
      this._camera.quaternion.setFromRotationMatrix(matrix)
    }
    this._camera.position.copy(target).addScaledVector(up, offset)
    const ratio = vehicleType === 'bike' ? 3 : vehicleType === 'moto' ? 1.75 : vehicleType === 'skate' ? 3.5 : vehicleType === 'jetski' ? 2 : null
    if (ratio != null && this._linearVel > 0) {
      const roll = THREE.MathUtils.degToRad(Math.trunc((-this.navigation.rotationalVelocity * this._linearVel) / (this.navigation.maximumSpeed * ratio)))
      this._camera.position.addScaledVector(up, CAM_HEIGHT * (Math.cos(roll) - 1)).addScaledVector(right, -CAM_HEIGHT * Math.sin(roll))
      this._camera.rotateZ(roll)
    }
    if (this._flightMode) {
      this._camera.rotateX(-Math.PI / 6)
    }
    this._boundary = boundary
    this._camera.rotateY(this._lookYaw)
    this._mouseLook.apply(this._camera)
    return { fromPos, toPos: this._camera.position.clone(), normalizedSpeed }
  }

  update(delta: number, vehicleType: VehicleType | null, maximumSpeed?: number): { fromPos: THREE.Vector3; toPos: THREE.Vector3; normalizedSpeed: number } {
    if (this._externalVelocity.lengthSq() > 0.0001) {
      this._camera.position.copy(this.constrainDisplacement(this._camera.position, this._externalVelocity.clone().multiplyScalar(delta)))
      this._externalVelocity.multiplyScalar(Math.max(0, 1 - delta * 4))
    }
    const mouseWasd = engine.input.mouseWasd && !engine.isPresenting
    this._mouseLook.begin(this._camera, engine.input.consumeMouseLook(), mouseWasd)
    this._camera.rotateY(-this._lookYaw)
    if (mouseWasd || !engine.input.dragging) {
      this.navigation.setTargets(320, 240, false)
    }
    if (mouseWasd) {
      this._lookYaw = 0
    }
    const speedMultiplier = this._slewMode ? 4 : 1
    const maxLinearVel = maximumSpeed ?? (vehicleType != null ? VEHICLE_MAX_LINEAR_VEL[vehicleType] : WALK_SPEED)

    const flags = engine.input.getNavigationFlags()
    if (engine.isPresenting) {
      flags.up = engine.xrWalking
      flags.down = false
      flags.left = false
      flags.right = false
      this.navigation.setTargets(320, 240, false)
    }
    const settings = getSettings()
    const pad = settings.gamepad ? engine.input.getGamepad(navigator.getGamepads(), settings.gamepadIndex) : null
    if (!mouseWasd && pad?.pov != null) {
      this._lookYaw = -THREE.MathUtils.degToRad(pad.pov)
    }
    const targetLinearVel = (flags.up ? maxLinearVel : flags.down ? -maxLinearVel : pad != null ? ((50 - pad.y) / 50) * maxLinearVel : 0) * speedMultiplier
    const targetRotVel = flags.left ? MAX_ROT_VEL : flags.right ? -MAX_ROT_VEL : pad != null ? ((50 - pad.x) / 50) * MAX_ROT_VEL : 0
    const targetVerticalVel = this._slewMode ? (engine.isKeyDown('q') ? maxLinearVel * speedMultiplier : engine.isKeyDown('e') ? -maxLinearVel * speedMultiplier : 0) : 0
    const targetPitchVel = this._slewMode && !mouseWasd ? (engine.isKeyDown('w') ? MAX_ROT_VEL : engine.isKeyDown('s') ? -MAX_ROT_VEL : 0) : 0

    const linearAccel = targetLinearVel !== 0 ? MAX_LINEAR_ACCEL * (flags.ctrl ? 4 : 1) : MAX_LINEAR_DECEL
    const pitchAccel = (targetPitchVel !== 0 ? MAX_ROT_ACCEL * (flags.ctrl ? 2 : 1) : MAX_ROT_DECEL) * 40

    if (this._slewMode) {
      this._linearVel = targetLinearVel
      this._rotVel = targetRotVel
      this._verticalVel = targetVerticalVel
      this._pitchVel = targetPitchVel
    } else {
      this.navigation.maximumSpeed = maxLinearVel
      this.navigation.update(delta, flags, pad)
      this._linearVel = this.navigation.linearVelocity
      this._rotVel = this.navigation.rotationalVelocity * 0.4 * NAV_REFERENCE_TICK_HZ
      this._verticalVel = this._calculateNewVel(targetVerticalVel, this._verticalVel, linearAccel, delta)
      this._pitchVel = this._calculateNewVel(targetPitchVel, this._pitchVel, pitchAccel, delta)
    }

    const strafe = mouseWasd ? engine.input.strafe : 0
    const targetStrafeVel = strafe * maxLinearVel * speedMultiplier
    this._strafeVel = mouseWasd ? this._calculateNewVel(targetStrafeVel, this._strafeVel, (strafe === 0 ? 50 : flags.ctrl ? 15 : 3.75) * this.accelerationMultiplier, delta) : 0
    const vel = Math.hypot(this._linearVel, this._strafeVel)
    const maxVelCurrent = maxLinearVel * speedMultiplier
    const normalizedSpeed = mouseWasd ? Math.min(1, vel / maxVelCurrent) : vel / maxVelCurrent

    const bounded = this.navigateBoundary(delta, vehicleType, normalizedSpeed)
    if (bounded != null) {
      return bounded
    }
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
    const leanRatio = vehicleType === 'bike' ? 3 : vehicleType === 'moto' ? 1.75 : vehicleType === 'skate' ? 3.5 : vehicleType === 'jetski' ? 2 : null
    this._camera.rotation.z = leanRatio != null && this._linearVel > 0 ? THREE.MathUtils.degToRad(Math.trunc(-(this.navigation.rotationalVelocity * this._linearVel) / (maxLinearVel * leanRatio))) : 0

    const forward = new THREE.Vector3()
    ;(engine.isPresenting ? (engine.xrHeadCamera ?? this._camera) : this._camera).getWorldDirection(forward)
    if (this._slewMode || this._flightMode || engine.isPresenting) {
      forward.y = 0
      forward.normalize()
    }

    const fromPos = this._camera.position.clone()
    let toPos = fromPos.clone()
    const moveVec = (mouseWasd ? planarMovement(forward, new THREE.Vector3(0, 1, 0), this._linearVel, this._strafeVel, maxVelCurrent) : forward.clone().multiplyScalar(this._linearVel)).multiplyScalar(delta)
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

    if (!this._slewMode && !this._flightMode) {
      this.placeOnGround(this._camera, new THREE.Vector3(0, engine.isPresenting ? 0 : CAM_HEIGHT, 0))
    }

    this._camera.rotateY(this._lookYaw)
    this._mouseLook.apply(this._camera)
    return { fromPos, toPos, normalizedSpeed }
  }
}
