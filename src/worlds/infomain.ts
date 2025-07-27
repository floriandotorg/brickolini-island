import * as THREE from 'three'
import { _InfoMain, iic027in_RunAnim } from '../actions/infomain'
import { InformationCenter_Music } from '../actions/jukebox'
import { playAnimation } from '../lib/animation'
import { Building } from '../lib/world/building'
import { Plants } from '../lib/world/plants'

export class InfoMain extends Building {
  public override async init(): Promise<void> {
    await super.init()

    const leftPointLight = new THREE.PointLight(0xffffff, 140)
    leftPointLight.position.set(7, 4, 4.5)
    this._scene.add(leftPointLight)

    const rightPointLight = new THREE.PointLight(0xffffff, 140)
    rightPointLight.position.set(-4, 4, 4.5)
    this._scene.add(rightPointLight)

    const centerPointLight = new THREE.PointLight(0xffffff, 80, 0, 5)
    centerPointLight.position.set(1.5, -4, 1)
    this._scene.add(centerPointLight)

    const frontPointLight = new THREE.PointLight(0xffffff, 100)
    frontPointLight.position.set(1.5, 0.75, -12)
    this._scene.add(frontPointLight)

    this._scene.add(await Plants.place(this, Plants.World.IMAIN))

    void playAnimation(this, iic027in_RunAnim)
  }

  protected getBuildingConfig() {
    return {
      startUpAction: _InfoMain,
      backgroundMusic: InformationCenter_Music,
      exitSpawnPoint: {
        boundaryName: 'INT46',
        source: 0,
        sourceScale: 0.5,
        destination: 2,
        destinationScale: 0.5,
      },
    }
  }
}
