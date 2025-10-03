import * as THREE from 'three'
import { _StartUp, Black_Ctl, Blue_Ctl, Build_Anim0, Build_Anim1, Build_Anim2, ColorBook_Bitmap, Gray_Ctl, Green_Ctl, Red_Ctl, Yellow_Ctl } from '../../actions/copter'
import { HelicopterBuild_Flic, HelicopterBuild_Music } from '../../actions/jukebox'
import { MovieSprite } from '../../lib/assets/movie-sprite'
import type { Composer } from '../../lib/effect/composer'
import { Building } from '../../lib/world/building'
import { World } from '../../lib/world/world'
import { buildColorControls, buildDecalMap, Carbuild } from './carbuild'

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
    const decalMap = buildDecalMap(this._building, [['chljety', ['Decals_Ctl1']], ['chrjety', ['Decals_Ctl2']], 'chwindy'])
    const colorControls = buildColorControls(this._building, Yellow_Ctl, Red_Ctl, Blue_Ctl, Green_Ctl, Gray_Ctl, Black_Ctl)
    this._carbuild = await Carbuild.create(this, this._building, displayPosition, { background: ColorBook_Bitmap, colors: colorControls }, null, decalMap, Build_Anim0, Build_Anim1, Build_Anim2)

    this._building.onButtonClicked = (buttonName, _) => {
      if (this._carbuild == null) {
        return false
      }
      switch (buttonName) {
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
