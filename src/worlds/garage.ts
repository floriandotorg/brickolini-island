import type * as THREE from 'three'
import { _StartUp, wgs023nu_RunAnim } from '../actions/garage'
import { GarageArea_Music } from '../actions/jukebox'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { World } from '../lib/world/world'

export class Garage extends World {
  private _building = new Building()

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
      }
      return false
    }

    void this.playAnimation(wgs023nu_RunAnim)
  }

  public override render(renderer: THREE.WebGLRenderer): void {
    this._building.render(renderer)
    super.render(renderer)
  }

  public override pointerDown(_event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._building.pointerDown(normalizedX, normalizedY)
  }
}
