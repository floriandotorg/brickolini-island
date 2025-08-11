import { _StartUp } from '../../actions/copter'
import type { Composer } from '../../lib/effect/composer'
import { switchWorld } from '../../lib/switch-world'
import { Building } from '../../lib/world/building'
import { World } from '../../lib/world/world'

export class Copter extends World {
  private _building = new Building()

  constructor() {
    super('copter')
  }

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: _StartUp,
    })

    this._building.onButtonClicked = buttonName => {
      switch (buttonName) {
        case 'Exit_Ctl':
          void switchWorld('police')
          return true
      }
      return false
    }
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
