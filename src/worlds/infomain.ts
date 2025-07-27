import * as THREE from 'three'
import { _InfoMain, iic027in_RunAnim } from '../actions/infomain'
import { InformationCenter_Music } from '../actions/jukebox'
import { playAnimation } from '../lib/animation'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { Plants } from '../lib/world/plants'
import { World } from '../lib/world/world'

export class InfoMain extends World {
  public _building = new Building()

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: _InfoMain,
      backgroundMusic: InformationCenter_Music,
    })

    this._building.onButtonClicked = buttonName => {
      switch (buttonName) {
        case 'LeftArrow_Ctl':
          void switchWorld('elevbott')
          return true
        case 'RightArrow_Ctl':
          void switchWorld('infoscor')
          return true
      }
      return false
    }

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

  public override render(renderer: THREE.WebGLRenderer): void {
    this._building.render(renderer)
    super.render(renderer)
  }

  public override pointerDown(_event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._building.pointerDown(normalizedX, normalizedY)
  }
}
