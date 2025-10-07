import * as THREE from 'three'
import { _StartUp, Black_Ctl, Blue_Ctl, Build_Anim0, Build_Anim1, Build_Anim2, ColorBook_Bitmap, Decal_Bitmap, Gray_Ctl, Green_Ctl, Red_Ctl, Yellow_Ctl } from '../../actions/jetski'
import { JetskiBuild_Flic, JetskiBuild_Music } from '../../actions/jukebox'
import { MovieSprite } from '../../lib/assets/movie-sprite'
import type { Composer } from '../../lib/effect/composer'
import { Building } from '../../lib/world/building'
import { World } from '../../lib/world/world'
import { buildColorControls, buildDecalMap, Carbuild } from './carbuild'

export class Jetski extends World {
  private _building = new Building()
  private _carbuild: Carbuild | null = null

  constructor() {
    super('jetski')
  }

  public get building(): Building {
    return this._building
  }

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      backgroundMusic: JetskiBuild_Music,
      exitSpawnPoint: {
        position: {
          boundaryName: 'EDG00_46',
          source: 3,
          sourceScale: 0.625,
          destination: 2,
          destinationScale: 0.03,
        },
        control: 'Exit_Ctl',
      },
    })

    const sprite = await MovieSprite.create(JetskiBuild_Flic, -0.25)
    sprite.loop = true
    sprite.play(this._building.scene)

    // TODO: Get "VIEW" transformation from the model's animation
    const displayPosition = new THREE.Vector3(1.44, -0.13, 3.1)
    const decalMap = buildDecalMap(this._building, [
      ['JSFRNT', ['Decals_Ctl', 'Decals_Ctl1', 'Decals_Ctl2', 'Decals_Ctl3']],
      ['JSWNSH', ['Decals_Ctl4', 'Decals_Ctl5', 'Decals_Ctl6', 'Decals_Ctl7']],
    ])
    const colorControls = buildColorControls(
      ColorBook_Bitmap,
      this._building,
      { action: Yellow_Ctl, color: 'lego yellow' },
      { action: Red_Ctl, color: 'lego red' },
      { action: Blue_Ctl, color: 'lego blue' },
      { action: Green_Ctl, color: 'lego green' },
      { action: Gray_Ctl, color: 'lego white' },
      { action: Black_Ctl, color: 'lego black' },
    )
    this._carbuild = await Carbuild.create(this, this._building, displayPosition, colorControls, Decal_Bitmap, decalMap, Build_Anim0, Build_Anim1, Build_Anim2)

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
