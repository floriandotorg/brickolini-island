import type { Roi3D } from '../assets/model'

export abstract class Entity {
  constructor(private readonly _roi: Roi3D) {}

  public get roi(): Roi3D {
    return this._roi
  }

  public async onClick(): Promise<boolean> {
    return false
  }
}
