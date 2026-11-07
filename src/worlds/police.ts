import { PoliceStation_Music } from '../actions/jukebox'
import { _StartUp, nps001ni_RunAnim, nps002la_RunAnim } from '../actions/police'
import type { Composer } from '../lib/effect/composer'
import { engine, type NormalizedMouseEvent } from '../lib/engine'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { World } from '../lib/world/world'

export class Police extends World {
  private readonly _building = new Building()
  private _playing = false
  private _generation = 0

  constructor() {
    super('police')
  }

  public override escape(): boolean {
    ++this._generation
    this._playing = false
    this.stopAnimationsInRange('police', 500, 510)
    return true
  }

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      backgroundMusic: PoliceStation_Music,
    })

    this._building.onButtonClicked = (buttonName, event) => {
      if (event.state !== 1) {
        return false
      }
      switch (buttonName) {
        case 'Donut_Ctl':
          this.playDonut()
          return true
        case 'Info_Ctl':
          this.escape()
          void switchWorld({ ending: null })
          return true
        case 'Door_Ctl':
          this.escape()
          void switchWorld('copter')
          return true
        case 'LeftArrow_Ctl':
        case 'RightArrow_Ctl':
          this.escape()
          void switchWorld('polidoor')
          return true
      }
      return false
    }
  }

  public override activate(composer: Composer): void {
    this._building.activate(composer)
    super.activate(composer)

    this._playing = false
    ++this._generation
  }

  private playDonut = (): void => {
    if (this._playing) {
      return
    }
    this._playing = true
    const generation = this._generation
    const save = engine.currentSaveGame
    const player = save.playerUnsafe
    const name = player === 'nick' ? 'nps002la' : player === 'laura' ? 'nps001ni' : save.policeNextAnimation
    save.policeNextAnimation = player === 'nick' || player === 'laura' ? name : name === 'nps001ni' ? 'nps002la' : 'nps001ni'
    void this.playAnimation(name === 'nps001ni' ? nps001ni_RunAnim : nps002la_RunAnim).then(() => {
      if (generation === this._generation) {
        this._playing = false
      }
    })
  }

  public override keyPressed(key: string): void {
    if (key === 'Space') {
      this.stopAnimationsInRange('police', 500, 501)
      this._playing = false
      return
    }
    super.keyPressed(key)
  }

  public override deactivate(): void {
    this.escape()
    super.deactivate()
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
