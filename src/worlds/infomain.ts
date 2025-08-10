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
  Laura_All_Movie,
  Mama_All_Movie,
  Nick_All_Movie,
  Papa_All_Movie,
  Pepper_All_Movie,
} from '../actions/infomain'
import { InformationCenter_Music } from '../actions/jukebox'
import { BookWig_Flic } from '../actions/sndanim'
import type { CharacterMovieAction } from '../lib/action-types'
import { MovieSprite } from '../lib/assets/movie-sprite'
import type { Composer } from '../lib/effect/composer'
import { engine } from '../lib/engine'
import { getSettings } from '../lib/settings'
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

  private async playCharacterMovie(characterMovie: { children: readonly [CharacterMovieAction, CharacterMovieAction, CharacterMovieAction] }): Promise<void> {
    const promises = [MovieSprite.createCharacterMovie(characterMovie.children[0], -0.252), MovieSprite.createCharacterMovie(characterMovie.children[1], -0.251), MovieSprite.createCharacterMovie(characterMovie.children[2], -0.25)]
    const [start, movie, end] = await Promise.all(promises)
    await start.play(this._building.scene)
    await movie.play(this._building.scene)
    start.removeFromParent()
    movie.removeFromParent()
    await end.play(this._building.scene)
    end.removeFromParent()
  }

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
        case 'Mama_Ctl':
          void this.playCharacterMovie(Mama_All_Movie)
          return true
        case 'Papa_Ctl':
          void this.playCharacterMovie(Papa_All_Movie)
          return true
        case 'Pepper_Ctl':
          void this.playCharacterMovie(Pepper_All_Movie)
          return true
        case 'Nick_Ctl':
          void this.playCharacterMovie(Nick_All_Movie)
          return true
        case 'Laura_Ctl':
          void this.playCharacterMovie(Laura_All_Movie)
          return true
      }
      return false
    }

    const leftPointLight = new THREE.PointLight(0xffffff, 140)
    leftPointLight.position.set(7, 4, 4.5)
    this.scene.add(leftPointLight)

    const rightPointLight = new THREE.PointLight(0xffffff, 140)
    rightPointLight.position.set(-4, 4, 4.5)
    this.scene.add(rightPointLight)

    const centerPointLight = new THREE.PointLight(0xffffff, 80, 0, 5)
    centerPointLight.position.set(1.5, -4, 1)
    this.scene.add(centerPointLight)

    if (getSettings().graphics.shadows) {
      leftPointLight.castShadow = true
      rightPointLight.castShadow = true
      centerPointLight.castShadow = true
    }

    this.scene.add(await Plants.place(this, Plants.World.IMAIN))

    ;(await this.getActor('infoman')).onClicked = () => {
      this._infomanHasBeenClicked = true
      this.skipAllRunningAnimations()
      if (this._welcomeTimeout != null) {
        clearTimeout(this._welcomeTimeout)
      }
      void this.playAnimation(ANIMATIONS[this._currentAnimationIndex])
      this._currentAnimationIndex = (this._currentAnimationIndex + 1) % ANIMATIONS.length
      return true
    }

    this.playAnimation(iic001in_RunAnim).then(async () => {
      engine.switchBackgroundMusic(InformationCenter_Music)
      this._welcomeTimeout = setTimeout(() => {
        if (!this._infomanHasBeenClicked) {
          void this.playAnimation(iicx17in_RunAnim)
        }
      }, 25_000)
    })

    setInterval(async () => {
      const movie = await MovieSprite.create(BookWig_Flic, -0.3)
      await movie.play(this._building.scene)
      movie.removeFromParent()
    }, 3_000)
  }

  public override activate(composer: Composer): void {
    this._building.activate(composer)
    super.activate(composer)
  }

  public override pointerDown(_event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._building.pointerDown(normalizedX, normalizedY)
  }

  public override pointerUp(_event: MouseEvent): void {
    this._building.pointerUp()
  }
}
