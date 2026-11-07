import { _StartUp, iic007in_PlayWav, iic037in_PlayWav } from '../actions/infodoor'
import { InformationCenter_Music } from '../actions/jukebox'
import type { AudioAction } from '../lib/action-types'
import type { Audio } from '../lib/assets/audio'
import type { Composer } from '../lib/effect/composer'
import { engine, type NormalizedMouseEvent } from '../lib/engine'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { Plants } from '../lib/world/plants'
import { World } from '../lib/world/world'

export class InfoDoor extends World {
  private readonly _building = new Building()
  private _line: Audio | null = null
  private _duck: symbol | null = null
  private _generation = 0

  private stopLine = (): void => {
    ++this._generation
    const audio = this._line
    this._line = null
    audio?.stop()
    if (this._duck != null) {
      engine.raiseBackgroundMusic(this._duck)
      this._duck = null
    }
  }

  private playLine = async (action: AudioAction): Promise<void> => {
    this.stopLine()
    const generation = this._generation
    this._duck = engine.lowerBackgroundMusic()
    try {
      const audio = await engine.playAudio(action, 'speech')
      if (generation !== this._generation) {
        audio.stop()
      } else {
        this._line = audio
        audio.onEnded = this.stopLine
      }
    } catch (error) {
      if (generation === this._generation) {
        this.stopLine()
      }
      throw error
    }
  }

  constructor() {
    super('infodoor')
    this.onDeactivate(this.stopLine)
  }

  public override escape(): boolean {
    this.stopLine()
    this.skipAllRunningAnimations(true)
    return true
  }

  public override async init(): Promise<void> {
    await super.init()
    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      backgroundMusic: InformationCenter_Music,
    })

    this.scene.add(await Plants.place(this, Plants.World.IISLE))

    this._building.onButtonClicked = buttonName => {
      this.stopLine()
      this.skipAllRunningAnimations(true)
      switch (buttonName) {
        case 'Door_Ctl':
          if (engine.currentSaveGame.playerUnsafe == null) {
            void this.playLine(iic037in_PlayWav)
          } else if (engine.currentSaveGame.isUnloaded) {
            void this.playLine(iic007in_PlayWav)
          } else {
            void switchWorld({ spawn: 'infocenterExited' })
          }
          return true
        case 'LeftArrow_Ctl':
          void switchWorld('infoscor')
          return true
        case 'RightArrow_Ctl':
          void switchWorld('elevbott')
          return true
      }
      return false
    }
  }

  public override activate(composer: Composer): void {
    super.activate(composer)
    this._building.activate(composer)
  }

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    if (this._building.pointerDown(event.normalizedX, event.normalizedY)) {
      return
    }
    await super.pointerDown(event)
  }

  public override pointerUp(_event: NormalizedMouseEvent): void {
    this._building.pointerUp()
  }
}
