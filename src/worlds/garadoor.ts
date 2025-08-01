import * as THREE from 'three'
import { GaraDoor as GaraDoor_StartUp } from '../actions/isle'
import { GarageArea_Music } from '../actions/jukebox'
import { calculateTransformationMatrix } from '../lib/assets/model'
import type { Composer } from '../lib/effect/composer'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { IsleBase } from './isle-base'

export class GarDoor extends IsleBase {
  public _building = new Building()

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: GaraDoor_StartUp,
      backgroundMusic: GarageArea_Music,
      exitSpawnPoint: {
        boundaryName: 'INT24',
        source: 0,
        sourceScale: 0.55,
        destination: 2,
        destinationScale: 0.71,
      },
    })

    this._building.onButtonClicked = buttonName => {
      switch (buttonName) {
        case 'GaraDoor_LeftArrow_Ctl':
        case 'GaraDoor_RightArrow_Ctl':
          void switchWorld('garage')
          return true
      }
      return false
    }

    const gas = this.scene.getObjectByName('gas')
    if (gas == null || !(gas instanceof THREE.Mesh)) {
      throw new Error('Gas mesh not found')
    }
    gas.visible = false

    const mat = calculateTransformationMatrix([-31.694365, 1.25, -2.814015], [0.650445, 0.0, 0.759553], [0.0, 1.0, 0.0])
    mat.decompose(this.camera.position, this.camera.quaternion, this.camera.scale)
    this.camera.rotateY(Math.PI)
    this.camera.fov = 90
    this.camera.updateProjectionMatrix()
  }

  public override activate(composer: Composer): void {
    super.activate(composer)
    this._building.activate(composer)
  }

  public override pointerDown(_event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._building.pointerDown(normalizedX, normalizedY)
  }
}
