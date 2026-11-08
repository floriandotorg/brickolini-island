import * as THREE from 'three'
import { CSM } from 'three/addons/csm/CSM.js'

export class CascadedShadows {
  private _csm: CSM | null = null
  private _sun: THREE.DirectionalLight | null = null
  private readonly _materials = new WeakSet<THREE.Material>()
  private _aspect = 0
  private _fov = 0

  public update(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    if (this._csm == null) {
      const sun = scene.children.find(object => object instanceof THREE.DirectionalLight && object.castShadow)
      if (!(sun instanceof THREE.DirectionalLight)) {
        return
      }
      this._sun = sun
      sun.castShadow = false
      this._csm = new CSM({ camera, parent: scene, cascades: 3, maxFar: 600, mode: 'practical', shadowMapSize: 2048, shadowBias: -0.00005, lightDirection: new THREE.Vector3().subVectors(sun.target.position, sun.position).normalize() })
      this._csm.fade = true
      this._csm.updateFrustums()
    }
    const csm = this._csm
    const sun = this._sun
    if (sun == null) {
      return
    }
    csm.lightDirection.subVectors(sun.target.position, sun.position).normalize()
    for (const light of csm.lights) {
      light.color.copy(sun.color)
      light.intensity = sun.intensity || this._intensity
      light.shadow.normalBias = 0.025
      light.shadow.radius = 2
    }
    this._intensity = sun.intensity || this._intensity
    sun.intensity = 0
    if (this._aspect !== camera.aspect || this._fov !== camera.fov) {
      this._aspect = camera.aspect
      this._fov = camera.fov
      csm.updateFrustums()
    }
    scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) {
        return
      }
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of materials) {
        if (!(material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshLambertMaterial || material instanceof THREE.MeshPhongMaterial) || this._materials.has(material)) {
          continue
        }
        this._materials.add(material)
        const previous = material.onBeforeCompile
        csm.setupMaterial(material)
        const compile = material.onBeforeCompile
        material.onBeforeCompile = (shader, renderer) => {
          compile.call(material, shader, renderer)
          previous.call(material, shader, renderer)
        }
        material.needsUpdate = true
      }
    })
    camera.updateWorldMatrix(true, false)
    csm.update()
  }

  private _intensity = 1

  public dispose(): void {
    if (this._csm) {
      for (const light of this._csm.lights) {
        light.shadow.dispose()
      }
      this._csm.remove()
      this._csm.dispose()
    }
  }
}
