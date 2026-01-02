import * as THREE from 'three'
import { ElevDown as ElevDown_StartUp } from '../../actions/isle'
import { InfoCenter_3rd_Floor_Music } from '../../actions/jukebox'
import type { Composer } from '../../lib/effect/composer'
import type { NormalizedMouseEvent } from '../../lib/engine'
import { switchWorld } from '../../lib/switch-world'
import { Building } from '../../lib/world/building'
import { ElevatorEntrance } from '../../lib/world/world'
import { IsleBase } from '../isle-base'

export class ElevDown extends IsleBase {
  private readonly _building = new Building()

  constructor() {
    super('elevdown', 'Isle')
  }

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: ElevDown_StartUp,
      backgroundMusic: InfoCenter_3rd_Floor_Music,
    })

    this._building.onButtonClicked = buttonName => {
      switch (buttonName) {
        case 'ElevDown_Elevator_Ctl':
          void switchWorld({ name: 'elevride', floor: ElevatorEntrance.Third })
          return true
        case 'ElevDown_RightArrow_Ctl':
          void switchWorld('seaview')
          return true
        case 'ElevDown_LeftArrow_Ctl':
          void switchWorld('observe')
          return true
      }
      return false
    }

    const infocenter = this.scene.getObjectByName('infocen')
    if (infocenter == null || !(infocenter instanceof THREE.Group)) {
      throw new Error('Infocenter mesh not found')
    }
    infocenter.visible = false

    this._updateCameraProjection([-93.37283, 19.4375, -10.382307], [0.0, -0.254006, 0.967203], [0.0, 0.967203, 0.254006], 90)
  }

  public override async activate(composer: Composer, _param?: unknown): Promise<void> {
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
