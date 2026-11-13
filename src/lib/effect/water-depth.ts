import * as THREE from 'three'
import { Water } from 'three/addons/objects/Water.js'

const bounds = new THREE.Sphere()

const reachesBelow = (mesh: THREE.Mesh | THREE.BatchedMesh, level: number): boolean => {
  if (mesh instanceof THREE.BatchedMesh || mesh.geometry.boundingSphere == null) {
    return true
  }
  bounds.copy(mesh.geometry.boundingSphere).applyMatrix4(mesh.matrixWorld)
  return bounds.center.y - bounds.radius < level
}

export class WaterDepth {
  private readonly _depth = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType)
  private readonly _target = new THREE.WebGLRenderTarget(1, 1, { depthTexture: this._depth, stencilBuffer: false })
  private readonly _material = new THREE.MeshDepthMaterial({ colorWrite: false })
  private readonly _size = new THREE.Vector2(1, 1)
  private readonly _range = new THREE.Vector2()
  private readonly _hidden: THREE.Object3D[] = []

  public resize(width: number, height: number): void {
    this._size.set(width, height)
    this._target.setSize(width, height)
  }

  private _waters: Water[] = []
  private _frame = 0

  public render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    if (this._frame++ % 60 === 0) {
      this._waters = []
      scene.traverse(object => {
        if (object instanceof Water) {
          this._waters.push(object)
        }
      })
    }
    const waters = this._waters.filter(water => water.visible && water.parent != null)
    if (waters.length === 0) {
      return
    }
    const level = Math.max(...waters.map(water => new THREE.Box3().setFromObject(water).max.y)) + 0.5
    this._range.set(camera.near, camera.far)
    for (const water of waters) {
      water.visible = false
      Object.assign(water.material.uniforms, { islandSceneDepth: { value: this._depth }, islandViewport: { value: this._size }, islandCameraRange: { value: this._range } })
    }
    scene.traverseVisible(object => {
      if ((object instanceof THREE.Mesh || object instanceof THREE.BatchedMesh) && !reachesBelow(object, level)) {
        this._hidden.push(object)
      }
    })
    for (const object of this._hidden) {
      object.visible = false
    }
    const override = scene.overrideMaterial
    const target = renderer.getRenderTarget()
    const shadows = renderer.shadowMap.autoUpdate
    scene.overrideMaterial = this._material
    renderer.shadowMap.autoUpdate = false
    try {
      renderer.setRenderTarget(this._target)
      renderer.render(scene, camera)
    } finally {
      scene.overrideMaterial = override
      renderer.shadowMap.autoUpdate = shadows
      renderer.setRenderTarget(target)
      for (const water of waters) {
        water.visible = true
      }
      for (const object of this._hidden) {
        object.visible = true
      }
      this._hidden.length = 0
    }
  }

  public dispose(): void {
    this._target.dispose()
    this._depth.dispose()
    this._material.dispose()
  }
}
