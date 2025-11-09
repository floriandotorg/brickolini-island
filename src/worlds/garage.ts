import * as THREE from 'three'
import { _StartUp, wgs023nu_RunAnim } from '../actions/garage'
import { GarageArea_Music } from '../actions/jukebox'
import type { Composer } from '../lib/effect/composer'
import type { NormalizedMouseEvent } from '../lib/engine'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { World } from '../lib/world/world'

export class Garage extends World {
  private _building = new Building()

  constructor() {
    super('garage')
  }

  public override async init(): Promise<void> {
    await super.init()
    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      backgroundMusic: GarageArea_Music,
    })

    this._building.onButtonClicked = buttonName => {
      switch (buttonName) {
        case 'LeftArrow_Ctl':
          void switchWorld('garadoor')
          return true
        case 'RightArrow_Ctl':
          void switchWorld('garadoor')
          return true
        case 'Buggy_Ctl':
          void switchWorld('dunecar')
          return true
      }
      return false
    }

    void this.playAnimation(wgs023nu_RunAnim, {
      location: new THREE.Vector3(0, 0, 0),
    })
  }

  public override activate(composer: Composer): void {
    this._building.activate(composer)
    super.activate(composer)
  }

  public override pointerDown(event: NormalizedMouseEvent): void {
    this._building.pointerDown(event.normalizedX, event.normalizedY)
  }

  public override pointerUp(_event: NormalizedMouseEvent): void {
    this._building.pointerUp()
  }
}
