import * as THREE from 'three'
import { _Isle, AmbulanceDashboard, BikeDashboard, MotoBikeDashboard, SkateDashboard, TowTrackDashboard } from '../actions/isle'
import { Beach_Music, BeachBlvd_Music, Cave_Music, CentralNorthRoad_Music, CentralRoads_Music, GarageArea_Music, Hospital_Music, InformationCenter_Music, Jail_Music, Park_Music, PoliceStation_Music, Quiet_Audio, RaceTrackRoad_Music, ResidentalArea_Music } from '../actions/jukebox'
import { getExtraValue } from '../lib/action-types'
import type { Composer } from '../lib/effect/composer'
import { engine } from '../lib/engine'
import { getSettings } from '../lib/settings'
import { switchWorld } from '../lib/switch-world'
import { IsleBase } from './isle-base'

const CAM_HEIGHT = 1.3
const MAX_LINEAR_VEL = 10
const MAX_ROT_VEL = 80
const MAX_LINEAR_ACCEL = 15
const MAX_ROT_ACCEL = 30
const MAX_LINEAR_DECEL = 50
const MAX_ROT_DECEL = 50
const EPSILON = 0.0001

export type IsleParam = {
  position: {
    boundaryName: string
    source: number
    sourceScale: number
    destination: number
    destinationScale: number
  }
}

export class Isle extends IsleBase {
  override async init(): Promise<void> {
    await super.init()

    this._boundaryManager.onTrigger = (name, data, direction) => {
      const music = [ResidentalArea_Music, BeachBlvd_Music, Cave_Music, CentralRoads_Music, Jail_Music, Hospital_Music, InformationCenter_Music, PoliceStation_Music, Park_Music, CentralNorthRoad_Music, GarageArea_Music, RaceTrackRoad_Music, Beach_Music, Quiet_Audio]

      const triggers: [number, number][] = [
        [11, 10],
        [6, 10],
        [3, 1],
        [4, 1],
        [1, 4],
        [1, 4],
        [13, 2],
        [13, 2],
        [13, 2],
        [4, 10],
        [11, 9],
        [9, 7],
        [8, 7],
        [8, 5],
        [5, 2],
        [2, 4],
        [4, 2],
        [4, 5],
        [11, 4],
        [12, 10],
        [10, 12],
        [10, 12],
        [14, 2],
        [14, 2],
      ]

      if (name[2] === 'M') {
        if (direction === 'inbound') {
          engine.switchBackgroundMusic(music[triggers[data - 1][0] - 1])
        } else {
          engine.switchBackgroundMusic(music[triggers[data - 1][1] - 1])
        }
      }
    }

    for (const child of _Isle.children) {
      const entity = getExtraValue(child, 'Object')?.toLowerCase()
      const worldName = (() => {
        switch (entity) {
          case 'hospitalentity':
            return 'hospital'
          case 'gasstationentity':
            return 'garage'
          case 'infocenterentity':
            return 'infomain'
          case 'policeentity':
            return 'police'
          default:
            return undefined
        }
      })()
      if (worldName == null) {
        continue
      }
      if (child.children[0] == null) {
        throw new Error(`Action for world ${worldName} has no children`)
      }
      const meshName = getExtraValue(child.children[0], 'DB_CREATE')?.toLowerCase()
      if (meshName == null) {
        throw new Error(`Found no valid mesh name for world ${worldName}`)
      }
      const buildingMesh = this.scene.getObjectByName(meshName)
      if (buildingMesh == null || !(buildingMesh instanceof THREE.Mesh)) {
        throw new Error(`Mesh ${meshName} not found`)
      }
      this.addClickListener(buildingMesh, async () => {
        console.log(`switched to ${meshName}, ${worldName}`)
        switchWorld(worldName)
      })
    }

    const bikeMesh = this.scene.getObjectByName('bike')
    const motobkMesh = this.scene.getObjectByName('motobk')
    const skateMesh = this.scene.getObjectByName('skate')
    const ambulanceMesh = this.scene.getObjectByName('ambul')
    const towtruckMesh = this.scene.getObjectByName('towtk')

    if (bikeMesh == null || !(bikeMesh instanceof THREE.Mesh) || motobkMesh == null || !(motobkMesh instanceof THREE.Mesh) || skateMesh == null || !(skateMesh instanceof THREE.Mesh) || ambulanceMesh == null || !(ambulanceMesh instanceof THREE.Mesh) || towtruckMesh == null || !(towtruckMesh instanceof THREE.Mesh)) {
      throw new Error('Vehicle meshes not found')
    }

    this._boundaryManager.placeObject(bikeMesh, 'INT44', 2, 0.5, 0, 0.5)
    this._boundaryManager.placeObject(motobkMesh, 'INT43', 4, 0.5, 1, 0.5)
    this._boundaryManager.placeObject(skateMesh, 'EDG02_84', 4, 0.5, 0, 0.5)

    const enterVehicle = async (vehicle: THREE.Mesh): Promise<void> => {
      await engine.transition()

      this._vehicleMesh = vehicle
      this._vehicleMesh.visible = false
      this.camera.position.set(vehicle.position.x, vehicle.position.y, vehicle.position.z)
      this.camera.quaternion.copy(vehicle.quaternion)
      this._placeObjectOnGround(this.camera)

      this._showDashboard()
    }

    if (import.meta.hot) {
      import.meta.hot.accept('../lib/world/dashboard', newModule => {
        if (newModule == null) {
          return
        }
        this._dashboard = new newModule.Dashboard()
        this._dashboard.onExit = () => {
          this._exitVehicle()
        }
        this._dashboard.resize(engine.width, engine.height)
        this._showDashboard()
      })
    }

    this.addClickListener(bikeMesh, async () => {
      await enterVehicle(bikeMesh)
    })
    this.addClickListener(motobkMesh, async () => {
      await enterVehicle(motobkMesh)
    })
    this.addClickListener(skateMesh, async () => {
      await enterVehicle(skateMesh)
    })
    this.addClickListener(ambulanceMesh, async () => {
      await enterVehicle(ambulanceMesh)
    })
    this.addClickListener(towtruckMesh, async () => {
      await enterVehicle(towtruckMesh)
    })

    this._dashboard.onExit = () => {
      this._exitVehicle()
    }

    this.camera.position.set(20, CAM_HEIGHT, 30)
    this.camera.lookAt(60, 0, 25)
    this._placeObjectOnGround(this.camera)
  }

  public override activate(composer: Composer, param?: IsleParam): void {
    super.activate(composer, param)
    this._dashboard.activate(composer)
    if (param != null) {
      this._boundaryManager.placeObject(this.camera, param.position.boundaryName, param.position.source, param.position.sourceScale, param.position.destination, param.position.destinationScale)
    }
  }

  private _showDashboard(): void {
    if (this._vehicleMesh == null) {
      return
    }

    switch (this._vehicleMesh.name) {
      case 'bike':
        this._dashboard.show(BikeDashboard)
        break
      case 'motobk':
        this._dashboard.show(MotoBikeDashboard)
        break
      case 'skate':
        this._dashboard.show(SkateDashboard)
        break
      case 'ambul':
        this._dashboard.show(AmbulanceDashboard)
        break
      case 'towtk':
        this._dashboard.show(TowTrackDashboard)
        break
      default:
        throw new Error(`Unknown vehicle: ${this._vehicleMesh.name}`)
    }
  }

  private _exitVehicle(): void {
    if (this._vehicleMesh == null) {
      return
    }

    this._vehicleMesh.position.copy(this.camera.position)
    this._vehicleMesh.quaternion.copy(this.camera.quaternion)
    this._placeObjectOnGround(this._vehicleMesh, new THREE.Vector3(0, 0, 0))
    this._vehicleMesh.visible = true

    this.camera.position.add(new THREE.Vector3(0, 0, -2).applyQuaternion(this.camera.quaternion))
    this._placeObjectOnGround(this.camera)

    this._dashboard.clear()
  }

  public override resize(width: number, height: number): void {
    super.resize(width, height)
    this._dashboard.resize(width, height)
  }

  public override pointerDown(event: MouseEvent, normalizedX: number, normalizedY: number): void {
    super.pointerDown(event, normalizedX, normalizedY)
    this._dashboard.pointerDown(normalizedX, normalizedY)
  }

  public override pointerUp(event: MouseEvent): void {
    super.pointerUp(event)
    this._dashboard.pointerUp()
  }

  private _placeObjectOnGround(object: THREE.Object3D, offset = new THREE.Vector3(0, CAM_HEIGHT, 0)): void {
    const downRay = new THREE.Raycaster(object.position.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, -1, 0), 0, 1000)
    const hit = downRay.intersectObjects(this._groundGroup)[0]
    if (hit) {
      object.position.copy(hit.point.clone().add(offset))
    }
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
      this._dayTime = (Math.round(((this._dayTime + 0.25) % 1) / 0.25) * 0.25) % 1
      this._updateSun()
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

  public override update(delta: number): void {
    super.update(delta)

    this._dayTime = (this._dayTime + delta * (1 / (24 * 60))) % 1
    this._updateSun()

    if (this._water != null) {
      this._water.material.uniforms.time.value += delta * 0.1
    }

    const speedMultiplier = this._slewMode ? 4 : 1

    const targetLinearVel = (engine.isKeyDown('ArrowUp') ? MAX_LINEAR_VEL : engine.isKeyDown('ArrowDown') ? -MAX_LINEAR_VEL : 0) * speedMultiplier

    const targetRotVel = engine.isKeyDown('ArrowLeft') ? MAX_ROT_VEL : engine.isKeyDown('ArrowRight') ? -MAX_ROT_VEL : 0

    const targetVerticalVel = this._slewMode ? (engine.isKeyDown('q') ? MAX_LINEAR_VEL * speedMultiplier : engine.isKeyDown('e') ? -MAX_LINEAR_VEL * speedMultiplier : 0) : 0

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
    const maxVelCurrent = MAX_LINEAR_VEL * (this._slewMode ? 4 : 1)
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

    const fromPos = this.camera.position.clone()
    let toPos = fromPos.clone()
    const moveVec = forward.clone().multiplyScalar(this._linearVel * delta)
    moveVec.y += this._verticalVel * delta
    if (moveVec.length() > 0) {
      if (this._slewMode) {
        this.camera.position.add(moveVec)
      } else {
        const slideMove = this._collideAndSlide(this.camera.position, moveVec)
        if (slideMove.length() > EPSILON) {
          this.camera.position.add(slideMove)
          toPos = this.camera.position.clone()
        }
      }
    }

    this._boundaryManager.update(fromPos, toPos)

    this.setDebugData(this.camera.position, new THREE.Vector3(0, 0, 1).applyEuler(this.camera.rotation), this._slewMode)

    if (!this._slewMode) {
      this._placeObjectOnGround(this.camera)
    }
  }
}
