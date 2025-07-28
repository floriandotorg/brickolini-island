import * as THREE from 'three'
import {
  _InfoMain,
  iic001in_RunAnim,
  iic019in_RunAnim,
  iic020in_RunAnim,
  iic021in_RunAnim,
  iic022in_RunAnim,
  iic023in_RunAnim,
  iic024in_RunAnim,
  iic025in_RunAnim,
  iic026in_RunAnim,
  iic027in_RunAnim,
  iic029in_RunAnim,
  iic032in_RunAnim,
  iica28in_RunAnim,
  iicb28in_RunAnim,
  iicc28in_RunAnim,
  iicx17in_RunAnim,
} from '../actions/infomain'
import { InformationCenter_Music } from '../actions/jukebox'
import { engine } from '../lib/engine'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { Plants } from '../lib/world/plants'
import { World } from '../lib/world/world'

const ANIMATIONS = [iic019in_RunAnim, iic020in_RunAnim, iic021in_RunAnim, iic022in_RunAnim, iic023in_RunAnim, iic024in_RunAnim, iic025in_RunAnim, iic026in_RunAnim, iic027in_RunAnim, iica28in_RunAnim, iicb28in_RunAnim, iicc28in_RunAnim, iic029in_RunAnim, iic032in_RunAnim]

export class InfoMain extends World {
  private _building = new Building()

  private _welcomeTimeout: number | null = null
  private _currentAnimationIndex = 0
  private _infomanHasBeenClicked = false

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: _InfoMain,
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

    ;(await this.getActor('infoman')).onClicked = () => {
      this._infomanHasBeenClicked = true
      this.skipCurrentAnimation()
      if (this._welcomeTimeout != null) {
        clearTimeout(this._welcomeTimeout)
      }
      void this.playAnimation(ANIMATIONS[this._currentAnimationIndex])
      this._currentAnimationIndex = (this._currentAnimationIndex + 1) % ANIMATIONS.length
    }

    this.playAnimation(iic001in_RunAnim).then(async () => {
      engine.switchBackgroundMusic(InformationCenter_Music)
      this._welcomeTimeout = setTimeout(() => {
        if (!this._infomanHasBeenClicked) {
          void this.playAnimation(iicx17in_RunAnim)
        }
      }, 25_000)
    })
  }

  public override render(renderer: THREE.WebGLRenderer): void {
    this._building.render(renderer)
    super.render(renderer)
  }

  public override pointerDown(_event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._building.pointerDown(normalizedX, normalizedY)
  }
}
