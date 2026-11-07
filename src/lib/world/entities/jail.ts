import type { IsleBase } from '../../../worlds/isle-base'
import type { Roi3D } from '../../assets/model'
import { Entity } from '../entity'

export class JailEntity extends Entity {
  constructor(
    roi: Roi3D,
    private readonly _world: IsleBase,
  ) {
    super(roi)
  }

  public override async onClick(): Promise<boolean> {
    if (!this._world.canExit) {
      return false
    }
    this._world.toggleManagedAnimations(false)
    await this._world.ambient.cameraTrigger(18)
    return true
  }
}
