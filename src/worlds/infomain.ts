import * as THREE from 'three'
import {
  _InfoMain,
  FrameHot_Bitmap,
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
  Laura_Up_Bitmap,
  Mama_All_Movie,
  Mama_Up_Bitmap,
  Nick_All_Movie,
  Nick_Up_Bitmap,
  Papa_All_Movie,
  Papa_Up_Bitmap,
  Pepper_All_Movie,
  Pepper_Up_Bitmap,
} from '../actions/infomain'
import { InformationCenter_Music } from '../actions/jukebox'
import { BookWig_Flic } from '../actions/sndanim'
import type { CharacterMovieAction, ImageAction } from '../lib/action-types'
import { createNormalizedSprite } from '../lib/assets/canvas-sprite'
import { getImage } from '../lib/assets/image'
import { MovieSprite } from '../lib/assets/movie-sprite'
import type { Composer } from '../lib/effect/composer'
import { engine, normalizePoint } from '../lib/engine'
import { getSettings } from '../lib/settings'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { Plants } from '../lib/world/plants'
import { World } from '../lib/world/world'

const ANIMATIONS = [iic019in_RunAnim, iic020in_RunAnim, iic021in_RunAnim, iic022in_RunAnim, iic023in_RunAnim, iic024in_RunAnim, iic025in_RunAnim, iic026in_RunAnim, iic027in_RunAnim, iica28in_RunAnim, iicb28in_RunAnim, iicc28in_RunAnim, iic029in_RunAnim, iic032in_RunAnim]

enum CharacterMovieState {
  idle,
  playing,
  cancelled,
}

export class InfoMain extends World {
  private _building = new Building()

  private readonly _characterFrame: THREE.Sprite
  private _welcomeTimeout: number | null = null
  private _currentAnimationIndex = 0
  private _infomanHasBeenClicked = false
  private _characterMovieState: CharacterMovieState = CharacterMovieState.idle
  private _characterMovie: [MovieSprite, MovieSprite, MovieSprite] | null = null

  constructor() {
    super('infomain')
    const bitmap = FrameHot_Bitmap
    this._characterFrame = createNormalizedSprite(0, 0, -0.4, bitmap.dimensions.width, bitmap.dimensions.height)
    this._building.scene.add(this._characterFrame)
    this._characterFrame.visible = false
    getImage(bitmap).then(image => {
      const map = new THREE.Texture()
      map.image = image
      map.needsUpdate = true
      const material = new THREE.SpriteMaterial({ map, color: 0xffffff })
      this._characterFrame.material = material
    })
  }

  private async playCharacterMovie(characterMovie: { children: readonly [CharacterMovieAction, CharacterMovieAction, CharacterMovieAction] }): Promise<void> {
    const play = async (movie: MovieSprite): Promise<void> => {
      if (this._characterMovieState !== CharacterMovieState.cancelled) {
        await movie.play(this._building.scene)
      }
    }

    if (this._characterMovieState === CharacterMovieState.playing) {
      return
    }
    this._characterMovieState = CharacterMovieState.playing
    const promises = [MovieSprite.createCharacterMovie(characterMovie.children[0], -0.252), MovieSprite.createCharacterMovie(characterMovie.children[1], -0.251), MovieSprite.createCharacterMovie(characterMovie.children[2], -0.25)]
    const [start, movie, end] = await Promise.all(promises)
    this._characterMovie = [start, movie, end]
    await play(start)
    await play(movie)
    start.removeFromParent()
    movie.removeFromParent()
    await play(end)
    end.removeFromParent()
    this._characterMovieState = CharacterMovieState.idle
    this._characterMovie = null
  }

  private placeCharacterFrame(control: ImageAction): void {
    const [normalizedX, normalizedY] = normalizePoint(control.location[0], control.location[1])
    this._characterFrame.position.x = normalizedX + this._characterFrame.scale.x / 2
    this._characterFrame.position.y = normalizedY - this._characterFrame.scale.y / 2
    this._characterFrame.visible = true
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
        case 'Book_Ctl':
          void switchWorld('regbook')
          return true
        case 'Mama_Ctl':
          engine.currentPlayerCharacter = 'mama'
          this.placeCharacterFrame(Mama_Up_Bitmap)
          void this.playCharacterMovie(Mama_All_Movie)
          return true
        case 'Papa_Ctl':
          engine.currentPlayerCharacter = 'papa'
          this.placeCharacterFrame(Papa_Up_Bitmap)
          void this.playCharacterMovie(Papa_All_Movie)
          return true
        case 'Pepper_Ctl':
          engine.currentPlayerCharacter = 'pepper'
          this.placeCharacterFrame(Pepper_Up_Bitmap)
          void this.playCharacterMovie(Pepper_All_Movie)
          return true
        case 'Nick_Ctl':
          engine.currentPlayerCharacter = 'nick'
          this.placeCharacterFrame(Nick_Up_Bitmap)
          void this.playCharacterMovie(Nick_All_Movie)
          return true
        case 'Laura_Ctl':
          engine.currentPlayerCharacter = 'laura'
          this.placeCharacterFrame(Laura_Up_Bitmap)
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

  public override deactivate(): void {
    if (this._welcomeTimeout != null) {
      clearTimeout(this._welcomeTimeout)
    }
    super.deactivate()
  }

  public override pointerDown(_event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._building.pointerDown(normalizedX, normalizedY)
  }

  public override pointerUp(_event: MouseEvent): void {
    this._building.pointerUp()
  }

  public override skipAllRunningAnimations(): void {
    super.skipAllRunningAnimations()
    this._characterMovieState = CharacterMovieState.cancelled
    if (this._characterMovie != null) {
      this._characterMovie[0].stop()
      this._characterMovie[1].stop()
      this._characterMovie[2].stop()
    }
  }
}
