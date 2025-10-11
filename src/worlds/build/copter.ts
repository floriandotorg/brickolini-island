import * as THREE from 'three'
import { _StartUp, Black_Ctl, Blue_Ctl, Build_Anim0, Build_Anim1, Build_Anim2, ColorBook_Bitmap, Decal_Sound, GetBrick_Sound, Gray_Ctl, Green_Ctl, Paint_Sound, PlaceBrick_Sound, Red_Ctl, Rotate_Sound, Shelf_Sound, Yellow_Ctl } from '../../actions/copter'
import { HelicopterBuild_Flic, HelicopterBuild_Music } from '../../actions/jukebox'
import { MovieSprite } from '../../lib/assets/movie-sprite'
import type { Composer } from '../../lib/effect/composer'
import { Building } from '../../lib/world/building'
import { World } from '../../lib/world/world'
import { buildColorControls, buildDecalControls, Carbuild } from './carbuild'

export class Copter extends World {
  private _building = new Building()
  private _carbuild: Carbuild | null = null

  constructor() {
    super('copter')
  }

  public get building(): Building {
    return this._building
  }

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      backgroundMusic: HelicopterBuild_Music,
      exitSpawnPoint: { position: 'police', control: 'Exit_Ctl' },
    })

    const sprite = await MovieSprite.create(HelicopterBuild_Flic, -0.25)
    sprite.loop = true
    sprite.play(this._building.scene)

    // TODO: Get "VIEW" transformation from the model's animation
    const displayPosition = new THREE.Vector3(1.31, 1.7, 5.11)
    const decalControls = await buildDecalControls(null, Decal_Sound, this._building, [['chljet', ['Decals_Ctl1']], ['chrjet', ['Decals_Ctl2']], 'chwind'])
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
    this._carbuild = await Carbuild.create(this, this._building, displayPosition, Shelf_Sound, GetBrick_Sound, PlaceBrick_Sound, Rotate_Sound, colorControls, decalControls, Build_Anim0, Build_Anim1, Build_Anim2)

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

  public override pointerDown(_event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._building.pointerDown(normalizedX, normalizedY)
    this._carbuild?.pointerDown(normalizedX, normalizedY)
  }

  public override pointerUp(_event: MouseEvent): void {
    this._building.pointerUp()
    if (this._carbuild != null) {
      this._carbuild.pointerUp()
      this._carbuild.rotating = false
    }
  }

  public override pointerMove(_event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._carbuild?.pointerMove(normalizedX, normalizedY)
  }

  public override update(delta: number): void {
    super.update(delta)
    this._carbuild?.update(delta)
  }
}
