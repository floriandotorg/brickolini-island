import * as THREE from 'three'
import { Water } from 'three/addons/objects/Water.js'

export class WaterDepth {
  private readonly _depth = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType)
  private readonly _target = new THREE.WebGLRenderTarget(1, 1, { depthTexture: this._depth, stencilBuffer: false })
  private readonly _material = new THREE.MeshDepthMaterial({ colorWrite: false })
  private readonly _size = new THREE.Vector2(1, 1)
  private readonly _range = new THREE.Vector2()

  public resize(width: number, height: number): void {
    this._size.set(width, height)
    this._target.setSize(width, height)
  }

  public render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    const waters: Water[] = []
    scene.traverse(object => {
      if (object instanceof Water && object.visible) {
        waters.push(object)
      }
    })
    if (waters.length === 0) {
      return
    }
    this._range.set(camera.near, camera.far)
    for (const water of waters) {
      water.visible = false
      Object.assign(water.material.uniforms, { islandSceneDepth: { value: this._depth }, islandViewport: { value: this._size }, islandCameraRange: { value: this._range } })
    }
    const override = scene.overrideMaterial
    const target = renderer.getRenderTarget()
    scene.overrideMaterial = this._material
    try {
      renderer.setRenderTarget(this._target)
      renderer.render(scene, camera)
    } finally {
      scene.overrideMaterial = override
      renderer.setRenderTarget(target)
      for (const water of waters) {
        water.visible = true
      }
    }
  }

  public dispose(): void {
    this._target.dispose()
    this._depth.dispose()
    this._material.dispose()
  }
}
