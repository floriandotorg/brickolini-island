import * as THREE from 'three'
import { _StartUp, hho003cl_RunAnim } from '../actions/hospital'
import { playAnimation } from '../lib/animation'
import { Building } from '../lib/world/building'

export class Hospital extends Building {
  public override async init(): Promise<void> {
    await super.init()

    const rightPointLight = new THREE.PointLight(0xfefefe, 20)
    rightPointLight.position.set(-6.8, 1, 1)
    this._scene.add(rightPointLight)

    const leftPointLight = new THREE.PointLight(0xfefefe, 20)
    leftPointLight.position.set(-0.25, 1, 1)
    this._scene.add(leftPointLight)

    void playAnimation(this, hho003cl_RunAnim)
  }

  protected getBuildingConfig() {
    return {
      startUpAction: _StartUp,
    }
  }
}
