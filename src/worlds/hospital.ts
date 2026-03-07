import * as THREE from 'three'
import { _StartUp, CopLed_Bitmap, hho003cl_RunAnim, hho016cl_RunAnim, PizzaLed_Bitmap } from '../actions/hospital'
import { Hospital_Music } from '../actions/jukebox'
import { createImageSprite } from '../lib/assets/canvas-sprite'
import type { Composer } from '../lib/effect/composer'
import { engine, type Interval, type NormalizedMouseEvent } from '../lib/engine'
import { getSettings } from '../lib/settings'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { World } from '../lib/world/world'

export class Hospital extends World {
  private readonly _building = new Building()
  private _copLed: { sprite: THREE.Sprite; interval: Interval } | null = null
  private _pizzaLed: { sprite: THREE.Sprite; interval: Interval } | null = null

  constructor() {
    super('hospital')
  }

  public override async init(): Promise<void> {
    await super.init()
    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      backgroundMusic: Hospital_Music,
      exitSpawnPoint: { spawn: 'hospitalExited' },
      noLights: true,
    })

    this._copLed = { sprite: createImageSprite(CopLed_Bitmap), interval: engine.createInterval(300) }
    this._copLed.sprite.visible = false
    this._pizzaLed = { sprite: createImageSprite(PizzaLed_Bitmap), interval: engine.createInterval(200) }
    this._pizzaLed.sprite.visible = false
    this._building.scene.add(this._copLed.sprite)
    this._building.scene.add(this._pizzaLed.sprite)

    const leftPointLight = new THREE.PointLight(0xfefefe, 20)
    leftPointLight.position.set(-0.25, 1, 1)
    this.scene.add(leftPointLight)

    if (getSettings().graphics.shadows) {
      leftPointLight.castShadow = true
      leftPointLight.shadow.radius = 1.5
    }

    void this.playAnimation(hho003cl_RunAnim).then(() => {
      this.debugPrintSceneGraph()
      this._building.exitAnimation = hho016cl_RunAnim
      const roi = this.findRoi('actor_ha')
      if (roi != null) {
        this.addClickListener(roi, async () => {
          void switchWorld({ spawn: 'hospitalExited' })
          return true
        })
      }
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
    if (this._copLed?.interval.resetExpired()) {
      this._copLed.sprite.visible = !this._copLed.sprite.visible
    }
    if (this._pizzaLed?.interval.resetExpired()) {
      this._pizzaLed.sprite.visible = !this._pizzaLed.sprite.visible
    }
  }
}
