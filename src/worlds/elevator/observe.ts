import * as THREE from 'three'
import {
  Avo905Ps_PlayWav,
  Avo906Ps_PlayWav,
  Avo907Ps_PlayWav,
  nic002pr_RunAnim,
  nic003pr_RunAnim,
  nic004pr_RunAnim,
  Observe_Globe1_Bitmap,
  Observe_Globe2_Bitmap,
  Observe_Globe3_Bitmap,
  Observe_Globe4_Bitmap,
  Observe_Globe5_Bitmap,
  Observe_Globe6_Bitmap,
  Observe_Monkey_Flc,
  Observe as Observe_StartUp,
} from '../../actions/isle'
import { InfoCenter_3rd_Floor_Music } from '../../actions/jukebox'
import type { Audio } from '../../lib/assets/audio'
import { createImageSprite } from '../../lib/assets/canvas-sprite'
import { MovieSprite } from '../../lib/assets/movie-sprite'
import type { Composer } from '../../lib/effect/composer'
import { engine, type NormalizedMouseEvent, type Sentinel } from '../../lib/engine'
import { changeSkyLightness, cycleSkyHue } from '../../lib/sky-color.ts'
import { switchWorld } from '../../lib/switch-world'
import { Building } from '../../lib/world/building'
import { Isle } from '../isle'

export class Observe extends Isle {
  private readonly _building = new Building()
  private readonly _globeSprites: THREE.Sprite[] = []
  private _globeShown = false
  private _planeActive = false
  private _generation = 0
  private _speechToken = 0
  private _captain: Audio | null = null
  private _duck: Sentinel | null = null
  private _monkey: MovieSprite | null = null

  constructor() {
    super('observe', true)

    for (const imageAction of [Observe_Globe1_Bitmap, Observe_Globe2_Bitmap, Observe_Globe3_Bitmap, Observe_Globe4_Bitmap, Observe_Globe5_Bitmap, Observe_Globe6_Bitmap]) {
      const globeSprite = createImageSprite(imageAction)
      globeSprite.visible = false
      this._building.scene.add(globeSprite)
      this._globeSprites.push(globeSprite)
    }
  }

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: Observe_StartUp,
      backgroundMusic: InfoCenter_3rd_Floor_Music,
    })

    this._building.onButtonClicked = (buttonName, event) => {
      switch (buttonName) {
        case 'Observe_Plane_Ctl':
          if (!this._planeActive) {
            this._planeActive = true
            const generation = this._generation
            const actions = [nic002pr_RunAnim, nic003pr_RunAnim, nic004pr_RunAnim]
            void this.playAnimation(actions[Math.floor(Math.random() * actions.length)]).then(() => {
              if (generation === this._generation) {
                this._planeActive = false
              }
            })
          }
          return true
        case 'Observe_Sun_Ctl':
        case 'Observe_Moon_Ctl': {
          const { h, s, v } = engine.currentSaveGame.backgroundColor
          engine.currentSaveGame.backgroundColor = { h, s: changeSkyLightness(s, buttonName === 'Observe_Sun_Ctl'), v }
          this._updateSun()
          return true
        }
        case 'Observe_SkyColor_Ctl': {
          const { h, s, v } = engine.currentSaveGame.backgroundColor
          engine.currentSaveGame.backgroundColor = { h: cycleSkyHue(h), s, v }
          this._updateSun()
          return true
        }
        case 'Observe_LCab_Ctl':
          void this.playMonkey()
          return true
        case 'Observe_RCab_Ctl':
          if (event.state === 1) {
            this._globeShown = true
            this._updateGlobeSprite()
          }
          return true
        case 'Observe_Draw1_Ctl':
        case 'Observe_Draw2_Ctl':
          this.speakCaptain()
          return true
        case 'Observe_RightArrow_Ctl':
          void switchWorld('elevdown')
          return true
        case 'Observe_LeftArrow_Ctl':
          void switchWorld('elevopen')
          return true
        case 'Observe_GlobeRArrow_Ctl':
          this._globeShown = true
          engine.currentSaveGame.nextSunPosition()
          this._updateSun()
          this._updateGlobeSprite()
          return true
        case 'Observe_GlobeLArrow_Ctl':
          this._globeShown = true
          engine.currentSaveGame.prevSunPosition()
          this._updateSun()
          this._updateGlobeSprite()
          return true
      }
      return false
    }

    const infocenter = this.scene.getObjectByName('infocen')
    if (infocenter == null || !(infocenter instanceof THREE.Group)) {
      throw new Error('Infocenter mesh not found')
    }
    infocenter.visible = false

    this._updateCameraProjection([-93.375, 19.4375, -10.375], [0.967075, -0.254493, 0.0], [0.254493, 0.967075, 0.0], 90)
  }

  public override async activate(composer: Composer, _param?: unknown): Promise<void> {
    ++this._generation
    this._globeShown = false
    this._planeActive = false
    await super.activate(composer)
    this._building.activate(composer)
    this._updateGlobeSprite()
  }

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    if (this._building.pointerDown(event.normalizedX, event.normalizedY)) {
      return
    }
    await super.pointerDown(event)
  }

  private _updateGlobeSprite(): void {
    const currentSunPosition = this._currentSunPosition
    for (const [index, globeSprite] of this._globeSprites.entries()) {
      globeSprite.visible = this._globeShown && index === currentSunPosition
    }
  }

  private stopCaptain = (): void => {
    ++this._speechToken
    this._captain?.stop()
    this._captain = null
    if (this._duck != null) {
      engine.raiseBackgroundMusic(this._duck)
      this._duck = null
    }
  }

  private speakCaptain = (): void => {
    this.stopCaptain()
    const token = this._speechToken
    const save = engine.currentSaveGame
    const index = save.cptClickDialogueIndex
    save.cptClickDialogueIndex = (index + 1) % 3
    this._duck = engine.lowerBackgroundMusic()
    void engine.playAudio([Avo905Ps_PlayWav, Avo906Ps_PlayWav, Avo907Ps_PlayWav][index], 'speech').then(audio => {
      if (token !== this._speechToken) {
        audio.stop()
        return
      }
      this._captain = audio
      audio.onEnded = this.stopCaptain
    })
  }

  private playMonkey = async (): Promise<void> => {
    const generation = this._generation
    this._monkey?.stop()
    this._monkey?.removeFromParent()
    const movie = await MovieSprite.create(Observe_Monkey_Flc, -0.2)
    if (generation === this._generation) {
      this._monkey = movie
      movie.hideAfterFinish = true
      void movie.play(this._building.scene)
    }
  }

  public override deactivate(): void {
    ++this._generation
    this.stopCaptain()
    this._monkey?.stop()
    this._monkey?.removeFromParent()
    this._monkey = null
    for (const action of [nic002pr_RunAnim, nic003pr_RunAnim, nic004pr_RunAnim]) {
      this.stopAnimationsInRange(action.siFile, action.id)
    }
    super.deactivate()
  }

  public override keyPressed(_key: string): void {}

  public override pointerUp(_event: NormalizedMouseEvent): void {
    this._building.pointerUp()
  }

  public override update(delta: number): void {
    super.update(delta)
    this._updateGlobeSprite()
  }
}
