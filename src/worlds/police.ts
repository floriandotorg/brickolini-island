import { PoliceStation_Music } from '../actions/jukebox'
import { _StartUp, nps001ni_RunAnim, nps002la_RunAnim } from '../actions/police'
import type { Composer } from '../lib/effect/composer'
import { engine } from '../lib/engine'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { World } from '../lib/world/world'

export class Police extends World {
  private _building = new Building()
  private _numVisits = 0

  constructor() {
    super('police')
  }

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      backgroundMusic: PoliceStation_Music,
      exitSpawnPoint: 'copter',
    })

    this._building.onButtonClicked = buttonName => {
      switch (buttonName) {
        case 'LeftArrow_Ctl':
        case 'RightArrow_Ctl':
          void switchWorld('polidoor')
          return true
      }
      return false
    }
  }

  public override activate(composer: Composer): void {
    this._building.activate(composer)
    super.activate(composer)

    if (engine.currentPlayerCharacter === 'nick') {
      void this.playAnimation(nps002la_RunAnim)
    } else if (engine.currentPlayerCharacter === 'laura') {
      void this.playAnimation(nps001ni_RunAnim)
    } else {
      if (this._numVisits % 2 === 0) {
        void this.playAnimation(nps002la_RunAnim)
      } else {
        void this.playAnimation(nps001ni_RunAnim)
      }
    }

    ++this._numVisits
  }

  public override pointerDown(_event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._building.pointerDown(normalizedX, normalizedY)
  }

  public override pointerUp(_event: MouseEvent): void {
    this._building.pointerUp()
  }
}
