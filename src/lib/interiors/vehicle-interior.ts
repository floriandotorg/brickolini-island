import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { VehicleType } from '../vehicle-types.ts'

export type InteriorAction = 'exit' | 'horn' | 'info'
export type InteriorMeter = 'speed' | 'fuel'

const interiorAssets: Partial<Record<VehicleType, string>> = {
  bike: '/models/interiors/bike.glb',
  moto: '/models/interiors/moto.glb',
}

export const getVehicleInteriorAsset = (type: VehicleType, enabled: boolean): string | null => (enabled ? (interiorAssets[type] ?? null) : null)

const MAX_LEAN = THREE.MathUtils.degToRad(2.5)
const LEAN_RESPONSE = 5
const LEAN_PIVOT = new THREE.Vector3(0, -1.25, -0.5)
const FORWARD_AXIS = new THREE.Vector3(0, 0, 1)

interface Meter {
  kind: InteriorMeter
  mesh: THREE.Mesh
  plane: THREE.Plane
  start: number
  length: number
}

export const configureInteriorCamera = (camera: THREE.PerspectiveCamera, width: number, height: number): void => {
  const aspect = Math.max(1, width) / Math.max(1, height)
  const viewWidth = Math.max(640, 480 * aspect)
  const viewHeight = Math.max(480, 640 / aspect)
  camera.setViewOffset(640, 480, (640 - viewWidth) / 2, 480 - viewHeight, viewWidth, viewHeight)
}

const disposeModel = (model: THREE.Group): void => {
  model.removeFromParent()
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  model.traverse(object => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry)
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material)
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) {
            textures.add(value)
          }
        }
      }
    }
  })
  for (const value of [...geometries, ...materials, ...textures]) {
    value.dispose()
  }
}

export class VehicleInterior {
  private _model: THREE.Group | null = null
  private _generation = 0
  private readonly _raycaster = new THREE.Raycaster()
  private readonly _pointer = new THREE.Vector2()
  private readonly _pressed = new Map<THREE.Object3D, THREE.Vector3>()
  private readonly _meters: Meter[] = []
  private readonly _localPlane = new THREE.Plane()
  private readonly _pressBounds = new THREE.Box3()
  private readonly _pressDirection = new THREE.Vector3()
  private readonly _leanOffset = new THREE.Vector3()
  private _lean = 0
  private readonly _load: (url: string) => Promise<THREE.Group>

  public constructor(load: (url: string) => Promise<THREE.Group> = async url => (await new GLTFLoader().loadAsync(url)).scene) {
    this._load = load
  }

  public get model(): THREE.Group | null {
    return this._model
  }

  public async show(type: VehicleType, enabled: boolean): Promise<boolean> {
    this.clear()
    const url = getVehicleInteriorAsset(type, enabled)
    if (url == null) {
      return false
    }
    const generation = this._generation
    const model = await this._load(url)
    if (generation !== this._generation) {
      disposeModel(model)
      return false
    }
    model.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true
        object.receiveShadow = true
        const kind: unknown = object.userData.interiorMeter
        if ((kind === 'speed' || kind === 'fuel') && object.material instanceof THREE.Material) {
          object.geometry.computeBoundingBox()
          const box = object.geometry.boundingBox ?? new THREE.Box3()
          const plane = new THREE.Plane()
          object.material = object.material.clone()
          object.material.clippingPlanes = [plane]
          this._meters.push({ kind, mesh: object, plane, start: box.min.x, length: box.max.x - box.min.x })
        }
      }
    })
    this._model = model
    this._lean = 0
    this.setMeters(0, 0)
    return true
  }

  public lean(turn: number, delta: number): void {
    if (this._model == null) {
      return
    }
    this._lean = THREE.MathUtils.damp(this._lean, THREE.MathUtils.clamp(turn, -1, 1) * MAX_LEAN, LEAN_RESPONSE, delta)
    this._model.quaternion.setFromAxisAngle(FORWARD_AXIS, this._lean)
    this._model.position.copy(LEAN_PIVOT).sub(this._leanOffset.copy(LEAN_PIVOT).applyQuaternion(this._model.quaternion))
  }

  public setMeters(speed: number, fuel: number): void {
    for (const meter of this._meters) {
      const fill = THREE.MathUtils.clamp(meter.kind === 'speed' ? speed : fuel, 0, 1)
      meter.mesh.visible = fill > 0.001
      meter.mesh.updateWorldMatrix(true, false)
      this._localPlane.normal.set(-1, 0, 0)
      this._localPlane.constant = meter.start + meter.length * fill
      meter.plane.copy(this._localPlane).applyMatrix4(meter.mesh.matrixWorld)
    }
  }

  public pick(camera: THREE.PerspectiveCamera, x: number, y: number): InteriorAction | null {
    if (this._model == null) {
      return null
    }
    this._model.updateMatrixWorld(true)
    camera.updateMatrixWorld(true)
    this._raycaster.setFromCamera(this._pointer.set(x, y), camera)
    const hit = this._raycaster.intersectObject(this._model, true)[0]
    let object: THREE.Object3D | null = hit?.object ?? null
    while (object != null) {
      const action: unknown = object.userData.interiorAction
      if (action === 'exit' || action === 'horn' || action === 'info') {
        return action
      }
      object = object.parent
    }
    return null
  }

  public press(action: InteriorAction): void {
    this.release()
    this._model?.traverse(object => {
      if (object.userData.interiorAction === action && action !== 'exit') {
        this._pressed.set(object, object.position.clone())
        if (action === 'horn') {
          object.position.y -= 0.012
        } else {
          object.updateWorldMatrix(true, true)
          this._pressBounds.setFromObject(object).getCenter(this._pressDirection)
          object.position.addScaledVector(this._pressDirection.normalize(), 0.008)
        }
      }
    })
  }

  public release(): void {
    for (const [object, position] of this._pressed) {
      object.position.copy(position)
    }
    this._pressed.clear()
  }

  public clear(): void {
    ++this._generation
    this.release()
    this._meters.length = 0
    if (this._model != null) {
      disposeModel(this._model)
      this._model = null
    }
  }
}
