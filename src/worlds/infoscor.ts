import * as THREE from 'three'
import { _StartUp, HistBook_Bmp, HistBook_Flc, iicc31in_PlayWav, LegoBox1_Flc, LegoBox2_Flc, LegoBox3_Flc, nin001pr_RunAnim } from '../actions/infoscor'
import { InformationCenter_Music } from '../actions/jukebox'
import type { Audio } from '../lib/assets/audio'
import { createImageSprite } from '../lib/assets/canvas-sprite'
import { MovieSprite } from '../lib/assets/movie-sprite'
import type { Composer } from '../lib/effect/composer'
import { engine, type NormalizedMouseEvent } from '../lib/engine'
import { paintScoreCube } from '../lib/score-cube.ts'
import { scoreState } from '../lib/session-state.ts'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { World } from '../lib/world/world'

export class InfoScor extends World {
  private readonly _building = new Building()
  private _tutorial: Audio | null = null
  private _visit = 0
  private _leaving = false
  private _bookStill: THREE.Sprite | null = null
  private _book: MovieSprite | null = null
  private _box: MovieSprite | null = null
  private _boxRequest = 0
  private _cubeTexture: THREE.Texture | null = null

  constructor() {
    super('infoscor')
  }

  public override escape(): boolean {
    this.stopTutorial()
    return true
  }

  public override async init(): Promise<void> {
    await super.init()
    await this._building.init({ world: this, startUpAction: _StartUp })
    this._building.onButtonClicked = (buttonName, event) => {
      if (this._leaving) {
        return true
      }
      if (buttonName === 'LegoBox_Ctl') {
        void this.playBox(event.state)
        return true
      }
      if (event.state !== 1) {
        return false
      }
      switch (buttonName) {
        case 'LeftArrow_Ctl':
          this.stopTutorial()
          this._leaving = true
          void switchWorld({ ending: null })
          return true
        case 'RightArrow_Ctl':
          this.stopTutorial()
          this._leaving = true
          void switchWorld('infodoor')
          return true
        case 'Book_Ctl':
          void this.openBook()
          return true
      }
      return false
    }
  }

  private playBox = async (state: number): Promise<void> => {
    const action = [LegoBox1_Flc, LegoBox2_Flc, LegoBox3_Flc][state - 1]
    if (action == null) {
      return
    }
    const request = ++this._boxRequest
    this._box?.stop()
    this._box?.removeFromParent()
    const movie = await MovieSprite.create(action, -0.2)
    if (request !== this._boxRequest || this._leaving) {
      return
    }
    this._box = movie
    movie.hideAfterFinish = true
    await movie.play(this._building.scene)
  }

  private openBook = async (): Promise<void> => {
    this._leaving = true
    this.stopTutorial()
    const visit = this._visit
    this._bookStill = createImageSprite(HistBook_Bmp)
    this._building.scene.add(this._bookStill)
    const movie = await MovieSprite.create(HistBook_Flc, -0.1)
    if (visit !== this._visit) {
      return
    }
    this._book = movie
    await movie.play(this._building.scene)
    if (visit === this._visit) {
      void switchWorld('histbook')
    }
  }

  public override async activate(composer: Composer): Promise<void> {
    this._building.activate(composer)
    super.activate(composer)
    this._leaving = false
    const visit = ++this._visit
    const texture = await paintScoreCube(this.worldGroup, engine.currentSaveGame)
    this._cubeTexture?.dispose()
    this._cubeTexture = texture
    const cube = await this.buildAnimation(nin001pr_RunAnim)
    void this.playAnimationClip(this.scene, new THREE.AnimationClip(cube.animation.tree.name, -1, cube.tracks), { loop: THREE.LoopRepeat })
    if (!scoreState.playCubeTutorial) {
      void engine.switchBackgroundMusic(InformationCenter_Music)
      return
    }
    engine.stopBackgroundMusic()
    const audio = await engine.playAudio(iicc31in_PlayWav, 'speech')
    if (visit !== this._visit || !scoreState.playCubeTutorial) {
      audio.stop()
      return
    }
    this._tutorial = audio
    audio.onEnded = () => {
      if (visit === this._visit) {
        this.stopTutorial()
      }
    }
  }

  private stopTutorial = (): void => {
    this._tutorial?.stop()
    this._tutorial = null
    if (scoreState.playCubeTutorial) {
      scoreState.playCubeTutorial = false
      void engine.switchBackgroundMusic(InformationCenter_Music)
    }
  }

  public override deactivate(): void {
    ++this._visit
    ++this._boxRequest
    this._tutorial?.stop()
    this._tutorial = null
    this._book?.stop()
    this._book?.removeFromParent()
    this._book = null
    this._box?.stop()
    this._box?.removeFromParent()
    this._box = null
    this._bookStill?.removeFromParent()
    this._bookStill = null
    this.skipAllRunningAnimations(true)
    super.deactivate()
  }

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    if (!this._leaving) {
      this._building.pointerDown(event.normalizedX, event.normalizedY)
    }
  }

  public override pointerUp(_event: NormalizedMouseEvent): void {
    this._building.pointerUp()
  }

  public override keyPressed(key: string): void {
    if (key === 'Space') {
      this.stopTutorial()
    }
  }
}
