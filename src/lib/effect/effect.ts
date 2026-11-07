import type * as THREE from 'three'

export abstract class Effect {
  private _material: THREE.ShaderMaterial | null = null

  abstract get fragmentShader(): string
  get uniforms(): Record<string, THREE.IUniform> {
    return {}
  }

  set material(material: THREE.ShaderMaterial) {
    this._material = material
  }

  get material(): THREE.ShaderMaterial {
    if (this._material == null) {
      throw new Error('Material not set')
    }
    return this._material
  }
}
