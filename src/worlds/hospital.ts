import * as THREE from 'three'
import { _StartUp, hho003cl_RunAnim } from '../actions/hospital'
import { Hospital_Music } from '../actions/jukebox'
import type { Composer } from '../lib/effect/composer'
import type { NormalizedMouseEvent } from '../lib/engine'
import { getSettings } from '../lib/settings'
import { Building } from '../lib/world/building'
import { World } from '../lib/world/world'

export class Hospital extends World {
  private readonly _building = new Building()

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

    const leftPointLight = new THREE.PointLight(0xfefefe, 20)
    leftPointLight.position.set(-0.25, 1, 1)
    this.scene.add(leftPointLight)

    if (getSettings().graphics.shadows) {
      leftPointLight.castShadow = true
      leftPointLight.shadow.radius = 1.5
    }

    void this.playAnimation(hho003cl_RunAnim)
  }

  public override activate(composer: Composer): void {
    this._building.activate(composer)
    super.activate(composer)
  }

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    if (this._building.pointerDown(event.normalizedX, event.normalizedY)) {
      return
    }
    super.pointerDown(event)
  }

  public override pointerUp(_event: NormalizedMouseEvent): void {
    this._building.pointerUp()
  }
}
