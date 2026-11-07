import type * as THREE from 'three'
import type { Roi3D } from '../assets/model'

export abstract class Entity {
  constructor(private readonly _roi: Roi3D) {}

  public get roi(): Roi3D {
    return this._roi
  }

  public async onClick(_object?: THREE.Object3D): Promise<boolean> {
    return false
  }
}
