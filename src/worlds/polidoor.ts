import * as THREE from 'three'
import { PoliDoor as PoliDoor_StartUp } from '../actions/isle'
import { PoliceStation_Music } from '../actions/jukebox'
import { calculateTransformationMatrix } from '../lib/assets/model'
import type { Composer } from '../lib/effect/composer'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { IsleBase } from './isle-base'

export class PoliDoor extends IsleBase {
  public _building = new Building()

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: PoliDoor_StartUp,
      backgroundMusic: PoliceStation_Music,
      exitSpawnPoint: {
        boundaryName: 'EDG02_64',
        source: 2,
        sourceScale: 0.24,
        destination: 0,
        destinationScale: 0.84,
      },
    })

    this._building.onButtonClicked = buttonName => {
      switch (buttonName) {
        case 'PoliDoor_LeftArrow_Ctl':
        case 'PoliDoor_RightArrow_Ctl':
          void switchWorld('police')
          return true
      }
      return false
    }

    const policeStation = this.scene.getObjectByName('policsta')
    if (policeStation == null || !(policeStation instanceof THREE.Mesh)) {
      throw new Error('Police station mesh not found')
    }
    policeStation.visible = false

    const mat = calculateTransformationMatrix([-73.70144, 2.25, -88.91317], [0.911398, 0.0, 0.411526], [0.0, 1.0, 0.0])
    mat.decompose(this.camera.position, this.camera.quaternion, this.camera.scale)
    this.camera.rotateY(Math.PI)
    this.camera.fov = 90
    this.camera.updateProjectionMatrix()
  }

  public override activate(composer: Composer, _param?: unknown): void {
    super.activate(composer)
    this._building.activate(composer)
  }

  public override pointerDown(_event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._building.pointerDown(normalizedX, normalizedY)
  }
}
