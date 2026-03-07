import { _Isle, GaraDoor as GaraDoor_StartUp } from '../actions/isle'
import { GarageArea_Music } from '../actions/jukebox'
import type { Composer } from '../lib/effect/composer'
import type { NormalizedMouseEvent } from '../lib/engine'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { Isle } from './isle'

export class GarDoor extends Isle {
  private readonly _building = new Building()

  constructor() {
    super('garadoor')
    this._playerMovement.canMove = false
  }

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: GaraDoor_StartUp,
      backgroundMusic: GarageArea_Music,
      exitSpawnPoint: { spawn: 'garageExited' },
    })

    this.handleStartUpAction(_Isle)

    this._building.onButtonClicked = buttonName => {
      switch (buttonName) {
        case 'GaraDoor_LeftArrow_Ctl':
        case 'GaraDoor_RightArrow_Ctl':
          void switchWorld('garage')
          return true
      }
      return false
    }

    this.getRoi('gas').visible = false

    this._updateCameraProjection([-31.694365, 1.25, -2.814015], [0.650445, 0.0, 0.759553], [0.0, 1.0, 0.0], 90)
  }

  public override async activate(composer: Composer): Promise<void> {
    await super.activate(composer)
    this._building.activate(composer)
  }

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    if (this._building.pointerDown(event.normalizedX, event.normalizedY)) {
      return
    }
    await super.pointerDown(event)
  }

  public override pointerUp(_event: NormalizedMouseEvent): void {
    this._building.pointerUp()
  }
}
