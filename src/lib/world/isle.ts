import * as THREE from 'three'
import { AmbulanceDashboard, BikeDashboard, IslePath, MotoBikeDashboard, SkateDashboard } from '../../actions/isle'
import { Beach_Music, BeachBlvd_Music, Cave_Music, CentralNorthRoad_Music, CentralRoads_Music, GarageArea_Music, Hospital_Music, InformationCenter_Music, Jail_Music, Park_Music, PoliceStation_Music, Quiet_Audio, RaceTrackRoad_Music, ResidentalArea_Music } from '../../actions/jukebox'
import { getBoundaries } from '../assets/boundary'
import { getWorld } from '../assets/model'
import { engine } from '../engine'
import { BoundaryManager } from './boundary-manager'
import { Dashboard } from './dashboard'
import { Plants } from './plants'
import { World } from './world'

const CAM_HEIGHT = 1
const MAX_LINEAR_VEL = 10
const MAX_ROT_VEL = 80
const MAX_LINEAR_ACCEL = 15
const MAX_ROT_ACCEL = 30
const MAX_LINEAR_DECEL = 50
const MAX_ROT_DECEL = 50
const EPSILON = 0.0001

export class Isle extends World {
  private _slewMode: boolean = false
  private _linearVel = 0
  private _rotVel = 0
  private _verticalVel = 0
  private _pitchVel = 0
  private _groundGroup: THREE.Mesh[] = []
  private _boundaryManager = new BoundaryManager([])
  private _dashboard = new Dashboard(this)
  private _vehicleMesh: THREE.Mesh | null = null

  async init(): Promise<void> {
    const world = await getWorld('ACT1')
    this._scene.add(world)

    await Plants.place(this, Plants.World.ACT1)

    const ambientLight = new THREE.AmbientLight(new THREE.Color(0.3, 0.3, 0.3))
    this._scene.add(ambientLight)
    const sunLight = new THREE.PointLight(0xffffff, 1, 1000, 0)
    this._scene.add(sunLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff)
    this._scene.add(directionalLight)

    const setSkyColor = (hsl: { h: number; s: number; l: number }) => {
      const color = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l)
      this._scene.background = color
      const lightColor = new THREE.Color(Math.min(color.r * (1 / 0.23), 1), Math.min(color.g * (1 / 0.63), 1), Math.min(color.b * (1 / 0.85), 1))
      directionalLight.color = lightColor
      sunLight.color = lightColor
    }
    setSkyColor({ h: 0.56, s: 0.54, l: 0.68 })

    const setLightPosition = (index: number) => {
      const lights: [number, number, number, number, number, number][] = [
        [1.0, 0.0, 0.0, -150.0, 50.0, -50.0],
        [0.809, -0.588, 0.0, -75.0, 50.0, -50.0],
        [0.0, -1.0, 0.0, 0.0, 150.0, -150.0],
        [-0.309, -0.951, 0.0, 25.0, 50.0, -50.0],
        [-0.809, -0.588, 0.0, 75.0, 50.0, -50.0],
        [-1.0, 0.0, 0.0, 150.0, 50.0, -50.0],
      ]
      sunLight.position.set(lights[index][3], lights[index][4], lights[index][5])
      sunLight.lookAt(lights[index][0], lights[index][1], lights[index][2])
      directionalLight.position.set(lights[index][0], lights[index][1], lights[index][2])
    }
    setLightPosition(0)

    engine.switchBackgroundMusic(CentralNorthRoad_Music)

    this._boundaryManager = new BoundaryManager(await getBoundaries(IslePath))

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

    const findMesh = (name: string): THREE.Mesh => {
      const isle = world.children.find(c => c.name.toLowerCase() === name)
      if (isle == null || !(isle instanceof THREE.Mesh)) {
        throw new Error(`Mesh ${name} not found`)
      }
      return isle
    }

    // spell-checker: ignore brdg jailbrdg racebrdg
    for (const name of ['isle_hi', 'inf-brdg', 'jailbrdg', 'racebrdg']) {
      this._groundGroup.push(findMesh(name))
    }

    const bikeMesh = findMesh('bike')
    const motobkMesh = findMesh('motobk')
    const skateMesh = findMesh('skate')
    const ambulanceMesh = findMesh('ambul')

    this._boundaryManager.placeObject(bikeMesh, 'INT44', 2, 0.5, 0, 0.5)
    this._boundaryManager.placeObject(motobkMesh, 'INT43', 4, 0.5, 1, 0.5)
    this._boundaryManager.placeObject(skateMesh, 'EDG02_84', 4, 0.5, 0, 0.5)

    const enterVehicle = async (vehicle: THREE.Mesh): Promise<void> => {
      await engine.transition()

      this._vehicleMesh = vehicle
      this._vehicleMesh.visible = false
      this._camera.position.set(vehicle.position.x, vehicle.position.y, vehicle.position.z)
      this._camera.quaternion.copy(vehicle.quaternion)
      this._placeObjectOnGround(this._camera)

      switch (vehicle.name) {
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
        default:
          throw new Error(`Unknown vehicle: ${vehicle.name}`)
      }
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

    this._dashboard.onExit = () => {
      if (this._vehicleMesh == null) {
        return
      }

      this._vehicleMesh.position.copy(this._camera.position)
      this._vehicleMesh.quaternion.copy(this._camera.quaternion)
      this._placeObjectOnGround(this._vehicleMesh, new THREE.Vector3(0, 0, 0))
      this._vehicleMesh.visible = true

      this._camera.position.add(new THREE.Vector3(0, 0, -2).applyQuaternion(this._camera.quaternion))
      this._placeObjectOnGround(this._camera)

      this._dashboard.clear()
    }

    this._camera.position.set(20, CAM_HEIGHT, 30)
    this._camera.lookAt(60, 0, 0)
    this._placeObjectOnGround(this._camera)
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

  public override keyPressed(key: string): void {
    super.keyPressed(key)

    if (key === 'f') {
      this._slewMode = !this._slewMode

      if (!this._slewMode) {
        this._linearVel = 0
        this._rotVel = 0
        this._verticalVel = 0
        this._pitchVel = 0
        this._camera.position.y = 100
        this._placeObjectOnGround(this._camera)
      }
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
    for (let n = 0; n < MAX_ITERATIONS && remaining.length() > EPSILON; ++n) {
      const dir = remaining.clone().normalize()
      const ray = new THREE.Raycaster(pos, dir, 0, remaining.length() + 0.0001)
      const hit = ray.intersectObject(this._boundaryManager.walls)[0]
      if (!hit) {
        totalMove.add(remaining)
        break
      }

      const dist = Math.max(hit.distance - 0.0001, 0)
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

  async update(delta: number): Promise<void> {
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
      this._camera.rotation.x = 0
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

    this._boundaryManager.update(fromPos, toPos)

    this.setDebugData(this._camera.position, new THREE.Vector3(0, 0, 1).applyEuler(this._camera.rotation), this._slewMode)

    if (!this._slewMode) {
      this._placeObjectOnGround(this._camera)
    }
  }

  public override render(renderer: THREE.WebGLRenderer): void {
    super.render(renderer)
    this._dashboard.render(renderer)
  }
}
