import * as THREE from 'three'
import { Observe_Globe1_Bitmap, Observe_Globe2_Bitmap, Observe_Globe3_Bitmap, Observe_Globe4_Bitmap, Observe_Globe5_Bitmap, Observe_Globe6_Bitmap, Observe as Observe_StartUp } from '../../actions/isle'
import { InfoCenter_3rd_Floor_Music } from '../../actions/jukebox'
import { createImageSprite } from '../../lib/assets/canvas-sprite'
import { Control } from '../../lib/assets/control'
import type { Composer } from '../../lib/effect/composer'
import { engine, type NormalizedMouseEvent } from '../../lib/engine'
import { switchWorld } from '../../lib/switch-world'
import { Building } from '../../lib/world/building'
import { IsleBase } from '../isle-base'

export class Observe extends IsleBase {
  private readonly _building = new Building()
  private readonly _globeSprites: THREE.Sprite[] = []

  constructor() {
    super('observe', 'Isle')

    for (const imageAction of [Observe_Globe1_Bitmap, Observe_Globe2_Bitmap, Observe_Globe3_Bitmap, Observe_Globe4_Bitmap, Observe_Globe5_Bitmap, Observe_Globe6_Bitmap]) {
      const globeSprite = createImageSprite(imageAction, Control.normalizeZ(imageAction))
      globeSprite.visible = false
      this._building.scene.add(globeSprite)
      this._globeSprites.push(globeSprite)
    }
  }

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: Observe_StartUp,
      backgroundMusic: InfoCenter_3rd_Floor_Music,
    })

    this._building.onButtonClicked = buttonName => {
      switch (buttonName) {
        case 'Observe_RightArrow_Ctl':
          void switchWorld('elevdown')
          return true
        case 'Observe_LeftArrow_Ctl':
          void switchWorld('elevopen')
          return true
        case 'Observe_GlobeRArrow_Ctl':
          engine.currentSaveGame.nextSunPosition()
          this._updateSun()
          this._updateGlobeSprite()
          return true
        case 'Observe_GlobeLArrow_Ctl':
          engine.currentSaveGame.prevSunPosition()
          this._updateSun()
          this._updateGlobeSprite()
          return true
      }
      return false
    }

    const infocenter = this.scene.getObjectByName('infocen')
    if (infocenter == null || !(infocenter instanceof THREE.Group)) {
      throw new Error('Infocenter mesh not found')
    }
    infocenter.visible = false

    this._updateCameraProjection([-93.375, 19.4375, -10.375], [0.967075, -0.254493, 0.0], [0.254493, 0.967075, 0.0], 90)
  }

  public override activate(composer: Composer, _param?: unknown): void {
    super.activate(composer)
    this._building.activate(composer)
    this._updateGlobeSprite()
  }

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    if (this._building.pointerDown(event.normalizedX, event.normalizedY)) {
      return
    }
    super.pointerDown(event)
  }

  private _updateGlobeSprite(): void {
    const currentSunPosition = this._currentSunPosition
    for (const [index, globeSprite] of this._globeSprites.entries()) {
      globeSprite.visible = index === currentSunPosition
    }
  }

  public override pointerUp(_event: NormalizedMouseEvent): void {
    this._building.pointerUp()
  }

  public override update(delta: number): void {
    super.update(delta)
    this._updateGlobeSprite()
  }
}
