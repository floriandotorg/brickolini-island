import { RaceCarBuild_Flic, RaceCarBuild_Music } from '../../actions/jukebox'
import { _StartUp, Build_Anim0, Build_Anim1, Build_Anim2 } from '../../actions/racecar'
import { MovieSprite } from '../../lib/assets/movie-sprite'
import type { Composer } from '../../lib/effect/composer'
import { Building } from '../../lib/world/building'
import { World } from '../../lib/world/world'
import { Carbuild } from './carbuild'

export class Racecar extends World {
  private _building = new Building()
  private _carbuild: Carbuild | null = null

  constructor() {
    super('racecar')
  }

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      backgroundMusic: RaceCarBuild_Music,
      exitSpawnPoint: {
        position: {
          boundaryName: 'INT16',
          source: 4,
          sourceScale: 0.1,
          destination: 2,
          destinationScale: 0,
        },
        control: 'Exit_Ctl',
      },
    })

    const sprite = await MovieSprite.create(RaceCarBuild_Flic, -0.25)
    sprite.loop = true
    sprite.play(this._building.scene)

    this._carbuild = await Carbuild.create(this, Build_Anim0, Build_Anim1, Build_Anim2)

    this._building.onButtonClicked = (buttonName, _) => {
      if (this._carbuild == null) {
        return false
      }
      switch (buttonName) {
        case 'Yellow_Ctl':
          this._carbuild.addPart()
          return true
        case 'Blue_Ctl':
          this._carbuild.removePart()
          return true
        case 'Platform_Ctl':
          this._carbuild.rotating = true
          return true
        case 'ShelfUp_Ctl': {
          this._carbuild.shelveUp()
          return true
        }
      }
      return false
    }
  }

  public override activate(composer: Composer): void {
    this._building.activate(composer)
    super.activate(composer)
  }

  public override pointerDown(_event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._building.pointerDown(normalizedX, normalizedY)
  }

  public override pointerUp(_event: MouseEvent): void {
    this._building.pointerUp()
    if (this._carbuild != null) {
      this._carbuild.rotating = false
    }
  }

  public override update(delta: number): void {
    super.update(delta)
    this._carbuild?.update(delta)
  }
}
