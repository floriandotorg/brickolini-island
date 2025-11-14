import * as THREE from 'three'
import { ElevOpen as ElevOpen_StartUp } from '../../actions/isle'
import { InfoCenter_3rd_Floor_Music } from '../../actions/jukebox'
import type { Composer } from '../../lib/effect/composer'
import type { NormalizedMouseEvent } from '../../lib/engine'
import { switchWorld } from '../../lib/switch-world'
import { Building } from '../../lib/world/building'
import { IsleBase } from '../isle-base'

export class ElevOpen extends IsleBase {
  private readonly _building = new Building()

  constructor() {
    super('elevopen', 'Isle')
  }

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: ElevOpen_StartUp,
      backgroundMusic: InfoCenter_3rd_Floor_Music,
    })

    this._building.onButtonClicked = buttonName => {
      switch (buttonName) {
        case 'ElevOpen_RightArrow_Ctl':
          void switchWorld('observe')
          return true
        case 'ElevOpen_LeftArrow_Ctl':
          void switchWorld('seaview')
          return true
      }
      return false
    }

    const infocenter = this.scene.getObjectByName('infocen')
    if (infocenter == null || !(infocenter instanceof THREE.Group)) {
      throw new Error('Infocenter mesh not found')
    }
    infocenter.visible = false

    this._updateCameraProjection([-93.37283, 19.4375, -10.382307], [0.0, -0.254982, -0.966946], [0.0, 0.966946, -0.254982], 90)
  }

  public override async activate(composer: Composer, _param?: unknown): Promise<void> {
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
