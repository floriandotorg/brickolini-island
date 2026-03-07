import * as THREE from 'three'
import { _StartUp, TrackLed_Bitmap, wgs023nu_RunAnim } from '../actions/garage'
import { GarageArea_Music } from '../actions/jukebox'
import { createImageSprite } from '../lib/assets/canvas-sprite'
import type { Composer } from '../lib/effect/composer'
import { engine, type Interval, type NormalizedMouseEvent } from '../lib/engine'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { World } from '../lib/world/world'

export class Garage extends World {
  private readonly _building = new Building()
  private _led: { sprite: THREE.Sprite; interval: Interval } | null = null

  constructor() {
    super('garage')
  }

  public override async init(): Promise<void> {
    await super.init()
    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      backgroundMusic: GarageArea_Music,
    })

    this._led = { sprite: createImageSprite(TrackLed_Bitmap), interval: engine.createInterval(300) }
    this._led.sprite.visible = false
    this._building.scene.add(this._led.sprite)

    this._building.onButtonClicked = buttonName => {
      switch (buttonName) {
        case 'LeftArrow_Ctl':
          void switchWorld('garadoor')
          return true
        case 'RightArrow_Ctl':
          void switchWorld('garadoor')
          return true
        case 'Buggy_Ctl':
          void switchWorld('dunecar')
          return true
      }
      return false
    }

    void this.playAnimation(wgs023nu_RunAnim, {
      location: new THREE.Vector3(0, 0, 0),
    })
  }

  public override activate(composer: Composer): void {
    this._building.activate(composer)
    super.activate(composer)
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

  protected override update(delta: number): void {
    super.update(delta)
    if (this._led?.interval.resetExpired()) {
      this._led.sprite.visible = !this._led.sprite.visible
    }
  }
}
