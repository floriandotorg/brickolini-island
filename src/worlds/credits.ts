import * as THREE from 'three'
import { Credits_Smk, Credits_Wav, LegoCredits as CreditsAction } from '../actions/credits'
import { isImageAction } from '../lib/action-types'
import type { Audio } from '../lib/assets/audio'
import { createImageSprite } from '../lib/assets/canvas-sprite'
import { MovieSprite } from '../lib/assets/movie-sprite'
import { type Composer, Render2D } from '../lib/effect/composer'
import { engine } from '../lib/engine'
import { isPresenterVisible } from '../lib/presentation-timing.ts'
import { infocenterState } from '../lib/session-state.ts'
import { World } from '../lib/world/world'

export class Credits extends World {
  private readonly _credits = new Render2D()
  private readonly _stills: { sprite: THREE.Sprite; start: number; duration: number }[] = []
  private _movie: MovieSprite | null = null
  private _audio: Audio | null = null
  private _elapsed = 0
  private _generation = 0
  private _finished = false

  constructor() {
    super('credits')
    this.fixedAspectRatio = true
    this._credits.scene.background = new THREE.Color(0)
  }

  public override async init(): Promise<void> {
    await super.init()
    const actions: readonly unknown[] = CreditsAction.children
    for (const action of actions) {
      if (!isImageAction(action) || !('startTime' in action) || typeof action.startTime !== 'number' || !('duration' in action) || typeof action.duration !== 'number') {
        continue
      }
      const sprite = createImageSprite(action)
      sprite.position.z = -0.5 + this._stills.length * 0.001
      sprite.visible = false
      this._credits.scene.add(sprite)
      this._stills.push({ sprite, start: action.startTime, duration: action.duration })
    }
  }

  public override async activate(composer: Composer): Promise<void> {
    composer.add(this._credits)
    engine.stopBackgroundMusic()
    infocenterState.state = 'playCredits'
    this._elapsed = 0
    this._finished = false
    const generation = ++this._generation
    const [movie, audio] = await Promise.all([MovieSprite.create(Credits_Smk, -0.9), engine.getAudio(Credits_Wav, 'cutscene')])
    if (generation !== this._generation) {
      return
    }
    this._movie = movie
    this._audio = audio
    audio.onEnded = this.finish
    audio.play()
    void movie.play(this._credits.scene)
  }

  protected override update(delta: number): void {
    super.update(delta)
    this._elapsed += delta * 1000
    for (const still of this._stills) {
      still.sprite.visible = isPresenterVisible(still.start, still.duration, this._elapsed)
    }
    if (this._elapsed >= Credits_Wav.duration) {
      this.finish()
    }
  }

  private finish = (): void => {
    if (!this._finished) {
      this._finished = true
      this.deactivate()
      window.location.reload()
    }
  }

  public override keyPressed(key: string): void {
    if (key === 'Space') {
      this.finish()
    }
  }

  public override escape(): boolean {
    this.finish()
    return false
  }

  public override deactivate(): void {
    ++this._generation
    this._audio?.stop()
    this._audio = null
    this._movie?.stop()
    this._movie?.removeFromParent()
    this._movie = null
    super.deactivate()
  }
}
