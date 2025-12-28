import * as THREE from 'three'
import { SeaView as SeaView_StartUp } from '../../actions/isle'
import { InfoCenter_3rd_Floor_Music } from '../../actions/jukebox'
import type { Composer } from '../../lib/effect/composer'
import type { NormalizedMouseEvent } from '../../lib/engine'
import { switchWorld } from '../../lib/switch-world'
import { Building } from '../../lib/world/building'
import { IsleBase } from '../isle-base'

export class SeaView extends IsleBase {
  private readonly _building = new Building()

  constructor() {
    super('seaview', 'Isle')
  }

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: SeaView_StartUp,
      backgroundMusic: InfoCenter_3rd_Floor_Music,
    })

    this._building.onButtonClicked = buttonName => {
      switch (buttonName) {
        case 'SeaView_RightArrow_Ctl':
          void switchWorld('elevopen')
          return true
        case 'SeaView_LeftArrow_Ctl':
          void switchWorld('elevdown')
          return true
      }
      return false
    }

    const infocenter = this.scene.getObjectByName('infocen')
    if (infocenter == null || !(infocenter instanceof THREE.Group)) {
      throw new Error('Infocenter mesh not found')
    }
    infocenter.visible = false

    this._updateCameraProjection([-93.375, 19.4375, -10.375], [-0.967075, -0.254493, 0.0], [-0.254493, 0.967075, 0.0], 90)
  }

  public override activate(composer: Composer, _param?: unknown): void {
    super.activate(composer)
    this._building.activate(composer)
  }

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    if (this._building.pointerDown(event.normalizedX, event.normalizedY)) {
      return
    }
    super.pointerDown(event)
  }

  public override pointerUp(_event: NormalizedMouseEvent): void {
    this._building.pointerUp()
  }
}
