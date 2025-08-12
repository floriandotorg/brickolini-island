import { RaceCarBuild_Flic, RaceCarBuild_Music } from '../../actions/jukebox'
import { _StartUp } from '../../actions/racecar'
import { MovieSprite } from '../../lib/assets/movie-sprite'
import type { Composer } from '../../lib/effect/composer'
import { Building } from '../../lib/world/building'
import { World } from '../../lib/world/world'

export class Racecar extends World {
  private _building = new Building()

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
  }
}
