import type * as THREE from 'three'
import { _StartUp } from '../actions/elevbott'
import { InformationCenter_Music } from '../actions/jukebox'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { World } from '../lib/world/world'

export class ElevBott extends World {
  private _building = new Building()

  public override async init(): Promise<void> {
    await super.init()
    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      backgroundMusic: InformationCenter_Music,
    })

    this._building.onButtonClicked = buttonName => {
      switch (buttonName) {
        case 'LeftArrow_Ctl':
          void switchWorld('infodoor')
          return true
        case 'RightArrow_Ctl':
          void switchWorld('infomain')
          return true
      }
      return false
    }
  }

  public override render(renderer: THREE.WebGLRenderer): void {
    this._building.render(renderer)
    super.render(renderer)
  }

  public override pointerDown(_event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._building.pointerDown(normalizedX, normalizedY)
  }
}
