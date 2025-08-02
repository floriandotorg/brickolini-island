import * as THREE from 'three'
import { _StartUp, hho003cl_RunAnim } from '../actions/hospital'
import { Hospital_Music } from '../actions/jukebox'
import type { Composer } from '../lib/effect/composer'
import { getSettings } from '../lib/settings'
import { Building } from '../lib/world/building'
import { World } from '../lib/world/world'

export class Hospital extends World {
  private _building = new Building()

  public override async init(): Promise<void> {
    await super.init()
    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      backgroundMusic: Hospital_Music,
      exitSpawnPoint: {
        boundaryName: 'EDG02_28',
        source: 3,
        sourceScale: 0.37,
        destination: 1,
        destinationScale: 0.52,
      },
    })

    const leftPointLight = new THREE.PointLight(0xfefefe, 20)
    leftPointLight.position.set(-0.25, 1, 1)
    this.scene.add(leftPointLight)

    if (getSettings().graphics.shadows) {
      leftPointLight.castShadow = true
    }

    void this.playAnimation(hho003cl_RunAnim)
  }

  public override activate(composer: Composer): void {
    this._building.activate(composer)
    super.activate(composer)
  }

  public override pointerDown(_event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._building.pointerDown(normalizedX, normalizedY)
  }
}
