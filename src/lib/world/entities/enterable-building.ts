import { switchWorld } from '../../switch-world'
import { Entity } from '../entity'
import type { NormalWorld, WorldSpawn } from '../world'

export abstract class EnterableBuilding extends Entity {
  protected abstract readonly world: WorldSpawn | NormalWorld

  override async onClick(): Promise<boolean> {
    void switchWorld(this.world)
    return true
  }
}
