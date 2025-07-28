import type * as THREE from 'three'
import { PoliDoor as PoliDoor_StartUp } from '../actions/isle'
import { PoliceStation_Music } from '../actions/jukebox'
import { calculateTransformationMatrix } from '../lib/assets/model'
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

    const mat = calculateTransformationMatrix([-31.694365, 1.25, -2.814015], [0.650445, 0.0, 0.759553], [0.0, 1.0, 0.0])
    mat.decompose(this._camera.position, this._camera.quaternion, this._camera.scale)
    this._camera.rotateY(Math.PI)
    this._camera.fov = 90
    this._camera.updateProjectionMatrix()
  }

  public override render(renderer: THREE.WebGLRenderer): void {
    super.render(renderer)
    this._building.render(renderer)
  }

  public override pointerDown(_event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._building.pointerDown(normalizedX, normalizedY)
  }
}
