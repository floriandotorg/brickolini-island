import * as THREE from 'three'

class MatrixCache {
  private readonly _position = new THREE.Vector3()
  private readonly _quaternion = new THREE.Quaternion()
  private readonly _scale = new THREE.Vector3()
  private readonly _matrix = new THREE.Matrix4()
  private readonly _parentMatrix = new THREE.Matrix4()
  private _parent: THREE.Object3D | null = null
  private _pivot: THREE.Vector3 | null = null
  private _ready = false

  public update(object: THREE.Object3D, compose: () => void): void {
    if (!object.matrixWorldAutoUpdate) {
      compose()
      return
    }
    const parentChanged = this._parent !== object.parent || (object.parent != null && !this._parentMatrix.equals(object.parent.matrixWorld))
    if (parentChanged) {
      this._parent = object.parent
      if (object.parent != null) {
        this._parentMatrix.copy(object.parent.matrixWorld)
      }
      object.matrixWorldNeedsUpdate = true
    }
    const pivotMatches = object.pivot == null ? this._pivot == null : this._pivot?.equals(object.pivot)
    if (this._ready && this._position.equals(object.position) && this._quaternion.equals(object.quaternion) && this._scale.equals(object.scale) && this._matrix.equals(object.matrix) && pivotMatches) {
      return
    }
    compose()
    this._position.copy(object.position)
    this._quaternion.copy(object.quaternion)
    this._scale.copy(object.scale)
    this._matrix.copy(object.matrix)
    this._pivot = object.pivot?.clone() ?? null
    this._ready = true
  }
}

export const cacheObjectMatrix = (object: THREE.Object3D): void => {
  if (object.updateMatrix !== THREE.Object3D.prototype.updateMatrix) {
    return
  }
  const cache = new MatrixCache()
  const compose = object.updateMatrix.bind(object)
  object.updateMatrix = () => cache.update(object, compose)
}

export const updateVisibleMatrices = (object: THREE.Object3D): void => {
  if (!object.visible) {
    return
  }
  if (object.updateMatrixWorld !== THREE.Object3D.prototype.updateMatrixWorld) {
    object.updateMatrixWorld(true)
    return
  }
  object.updateWorldMatrix(false, false, !object.matrixAutoUpdate)
  for (const child of object.children) {
    updateVisibleMatrices(child)
  }
}

export const updateRaycastMatrices = (objects: readonly THREE.Object3D[]): void => {
  for (const object of objects) {
    object.updateWorldMatrix(true, true)
  }
}
