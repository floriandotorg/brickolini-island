import * as THREE from 'three'
import { Background_Bitmap, hho006cl_RunAnim } from '../actions/hospital'
import { playAnimation } from '../lib/animation'
import { Building } from '../lib/world/building'

export class Hospital extends Building {
  public override async init(): Promise<void> {
    await super.init()

    await this.loadWorld('HOSP', Background_Bitmap)

    const rightPointLight = new THREE.PointLight(0xfefefe, 20)
    rightPointLight.position.set(-6.8, 1, 1)
    this._scene.add(rightPointLight)

    const leftPointLight = new THREE.PointLight(0xfefefe, 20)
    leftPointLight.position.set(-0.25, 1, 1)
    this._scene.add(leftPointLight)

    await playAnimation(this, hho006cl_RunAnim)
  }
}
