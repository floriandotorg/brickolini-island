import { _StartUp, iic007in_PlayWav, iic037in_PlayWav } from '../actions/infodoor'
import { InformationCenter_Music } from '../actions/jukebox'
import type { Composer } from '../lib/effect/composer'
import { engine } from '../lib/engine'
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
          if (engine.currentPlayerCharacter == null) {
            void engine.playAudio(iic037in_PlayWav)
          } else if (engine.currentSaveGame.name.length === 0) {
            void engine.playAudio(iic007in_PlayWav)
          } else {
            void switchWorld('isle', {
              position: {
                boundaryName: 'INT46',
                source: 0,
                sourceScale: 0.5,
                destination: 2,
                destinationScale: 0.5,
              },
            } satisfies IsleParam)
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

  public override pointerDown(_event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._building.pointerDown(normalizedX, normalizedY)
  }

  public override pointerUp(_event: MouseEvent): void {
    this._building.pointerUp()
  }
}
