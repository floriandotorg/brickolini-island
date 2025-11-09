import { _StartUp, iic007in_PlayWav, iic037in_PlayWav } from '../actions/infodoor'
import { InformationCenter_Music } from '../actions/jukebox'
import { getSpawnLocation } from '../lib/assets/spawn-location'
import type { Composer } from '../lib/effect/composer'
import { engine, type NormalizedMouseEvent } from '../lib/engine'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { World } from '../lib/world/world'
import type { IsleParam } from './isle-base'

export class InfoDoor extends World {
  private _building = new Building()

  constructor() {
    super('infodoor')
  }

  public override async init(): Promise<void> {
    await super.init()
    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      backgroundMusic: InformationCenter_Music,
    })

    this._building.onButtonClicked = buttonName => {
      switch (buttonName) {
        case 'Door_Ctl':
          if (engine.currentSaveGame.playerUnsafe == null) {
            void this.playAudio(iic037in_PlayWav, 'speech')
          } else if (engine.currentSaveGame.isUnloaded) {
            void this.playAudio(iic007in_PlayWav, 'speech')
          } else {
            void switchWorld('isle', getSpawnLocation('infocenterExited') satisfies IsleParam)
          }
          return true
        case 'LeftArrow_Ctl':
          void switchWorld('infoscor')
          return true
        case 'RightArrow_Ctl':
          void switchWorld('elevbott')
          return true
      }
      return false
    }
  }

  public override activate(composer: Composer): void {
    super.activate(composer)
    this._building.activate(composer)
  }

  public override pointerDown(event: NormalizedMouseEvent): void {
    this._building.pointerDown(event.normalizedX, event.normalizedY)
  }

  public override pointerUp(_event: NormalizedMouseEvent): void {
    this._building.pointerUp()
  }
}
