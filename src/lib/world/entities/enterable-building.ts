import type { IsleBase } from '../../../worlds/isle-base'
import type { Roi3D } from '../../assets/model'
import { switchWorld } from '../../switch-world'
import { Entity } from '../entity'
import type { NormalWorld, WorldSpawn } from '../world'

export abstract class EnterableBuilding extends Entity {
  protected abstract readonly world: WorldSpawn | NormalWorld

  constructor(
    roi: Roi3D,
    protected readonly _isle: IsleBase,
  ) {
    super(roi)
  }

  override async onClick(): Promise<boolean> {
    if (!this._isle.canExit) {
      return true
    }
    void switchWorld(this.world)
    return true
  }
}
