import * as THREE from 'three'
import { RaceCarBuild_Flic, RaceCarBuild_Music } from '../../actions/jukebox'
import { _StartUp, Black_Ctl, Blue_Ctl, Build_Anim0, Build_Anim1, Build_Anim2, ColorBook_Bitmap, Decal_Sound, GetBrick_Sound, Gray_Ctl, Green_Ctl, Paint_Sound, PlaceBrick_Sound, Red_Ctl, Rotate_Sound, Shelf_Sound, Yellow_Ctl } from '../../actions/racecar'
import { MovieSprite } from '../../lib/assets/movie-sprite'
import type { Composer } from '../../lib/effect/composer'
import type { NormalizedMouseEvent } from '../../lib/engine'
import { Building } from '../../lib/world/building'
import { World } from '../../lib/world/world'
import { buildColorControls, buildDecalControls, Carbuild } from './carbuild'

export class Racecar extends World {
  private readonly _building = new Building()
  private _carbuild: Carbuild | null = null

  constructor() {
    super('racecar')
  }

  public get building(): Building {
    return this._building
  }

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      backgroundMusic: RaceCarBuild_Music,
      exitSpawnPoint: {
        spawn: 'racecarbuildExited',
        control: 'Exit_Ctl',
      },
    })

    const sprite = await MovieSprite.create(RaceCarBuild_Flic, -0.25)
    sprite.loop = true
    sprite.play(this._building.scene)

    // TODO: Get "VIEW" transformation from the model's animation
    const displayPosition = new THREE.Vector3(0, 2.25, 2.62)
    const decalControls = await buildDecalControls(null, Decal_Sound, this._building, [['RCBACK', ['Decals_Ctl1']], ['RCTAIL', ['Decals_Ctl2']], 'rcfrnt'])
    const colorControls = await buildColorControls(
      ColorBook_Bitmap,
      Paint_Sound,
      this._building,
      { action: Yellow_Ctl, color: 'lego yellow' },
      { action: Red_Ctl, color: 'lego red' },
      { action: Blue_Ctl, color: 'lego blue' },
      { action: Green_Ctl, color: 'lego green' },
      { action: Gray_Ctl, color: 'lego white' },
      { action: Black_Ctl, color: 'lego black' },
    )
    this._carbuild = await Carbuild.create(this, this._building, displayPosition, Shelf_Sound, GetBrick_Sound, PlaceBrick_Sound, Rotate_Sound, colorControls, decalControls, 'racecarbuildExited', 'racecar', Build_Anim0, Build_Anim1, Build_Anim2)

    this._building.onButtonClicked = (buttonName, event) => {
      if (this._carbuild == null) {
        return false
      }
      return this._carbuild.handleControl(buttonName, event)
    }
  }

  public override activate(composer: Composer): void {
    this._building.activate(composer)
    super.activate(composer)
  }

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    if (this._building.pointerDown(event.normalizedX, event.normalizedY)) {
      return
    }
    this._carbuild?.pointerDown(event.normalizedX, event.normalizedY)
    super.pointerDown(event)
  }

  public override pointerUp(_event: NormalizedMouseEvent): void {
    this._building.pointerUp()
    if (this._carbuild != null) {
      this._carbuild.pointerUp()
      this._carbuild.rotating = false
    }
  }

  public override pointerMove(event: NormalizedMouseEvent): void {
    this._carbuild?.pointerMove(event.normalizedX, event.normalizedY)
  }

  public override update(delta: number): void {
    super.update(delta)
    this._carbuild?.update(delta)
  }
}
