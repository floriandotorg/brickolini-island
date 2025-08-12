import { _StartUp } from '../../actions/jetski'
import type { Composer } from '../../lib/effect/composer'
import { Building } from '../../lib/world/building'
import { World } from '../../lib/world/world'

export class Jetski extends World {
  private _building = new Building()

  constructor() {
    super('jetski')
  }

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      exitSpawnPoint: {
        position: {
          boundaryName: 'EDG00_46',
          source: 3,
          sourceScale: 0.625,
          destination: 2,
          destinationScale: 0.03,
        },
        control: 'Exit_Ctl',
      },
    })
  }

  public override activate(composer: Composer): void {
    this._building.activate(composer)
    super.activate(composer)
  }

  public override pointerDown(_event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._building.pointerDown(normalizedX, normalizedY)
  }

  public override pointerUp(_event: MouseEvent): void {
    this._building.pointerUp()
  }
}
