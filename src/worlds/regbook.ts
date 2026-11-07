import type * as THREE from 'three'
import { InformationCenter_Music } from '../actions/jukebox'
import {
  _StartUp,
  A_Bitmap,
  B_Bitmap,
  C_Bitmap,
  CheckHiLite_Bitmap,
  D_Bitmap,
  E_Bitmap,
  F_Bitmap,
  G_Bitmap,
  H_Bitmap,
  I_Bitmap,
  iic006in_RunAnim,
  iic007in_PlayWav,
  iic008in_PlayWav,
  J_Bitmap,
  K_Bitmap,
  L_Bitmap,
  M_Bitmap,
  N_Bitmap,
  O_Bitmap,
  P_Bitmap,
  Q_Bitmap,
  R_Bitmap,
  S_Bitmap,
  T_Bitmap,
  U_Bitmap,
  V_Bitmap,
  W_Bitmap,
  X_Bitmap,
  Y_Bitmap,
  Z_Bitmap,
} from '../actions/regbook'
import type { ImageAction } from '../lib/action-types'
import type { Audio } from '../lib/assets/audio'
import { createImageSprite, createNormalizedSprite } from '../lib/assets/canvas-sprite'
import type { Control } from '../lib/assets/control'
import { createTexture } from '../lib/assets/texture'
import type { Composer } from '../lib/effect/composer'
import { engine, type NormalizedMouseEvent, type Sentinel } from '../lib/engine'
import { getScoreHistory } from '../lib/score-history.ts'
import { infocenterState } from '../lib/session-state.ts'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import type { Character } from '../lib/world/character'
import { World } from '../lib/world/world'

const CHAR_WIDTH = 23
const ROW_HEIGHT = 27
const X_OFFSET = 343
const Y_OFFSET = 121
const MAX_LENGTH = 7

const letterTextures = new Map<string, THREE.Texture>()
const letterActions: [string, ImageAction][] = [
  ['A', A_Bitmap],
  ['B', B_Bitmap],
  ['C', C_Bitmap],
  ['D', D_Bitmap],
  ['E', E_Bitmap],
  ['F', F_Bitmap],
  ['G', G_Bitmap],
  ['H', H_Bitmap],
  ['I', I_Bitmap],
  ['J', J_Bitmap],
  ['K', K_Bitmap],
  ['L', L_Bitmap],
  ['M', M_Bitmap],
  ['N', N_Bitmap],
  ['O', O_Bitmap],
  ['P', P_Bitmap],
  ['Q', Q_Bitmap],
  ['R', R_Bitmap],
  ['S', S_Bitmap],
  ['T', T_Bitmap],
  ['U', U_Bitmap],
  ['V', V_Bitmap],
  ['W', W_Bitmap],
  ['X', X_Bitmap],
  ['Y', Y_Bitmap],
  ['Z', Z_Bitmap],
]
for (const [letter, action] of letterActions) {
  letterTextures.set(letter, createTexture(action))
}

export class Name {
  private _name = ''
  private _letters: THREE.Sprite[]

  constructor(scene: THREE.Scene, x: number, y: number, charWidth: number) {
    this._letters = []
    for (let n = 0; n < MAX_LENGTH; ++n) {
      const sprite = createNormalizedSprite(x + charWidth * n, y, A_Bitmap.location[2], A_Bitmap.dimensions.width, A_Bitmap.dimensions.height)
      sprite.name = `letter_${n}`
      sprite.visible = false
      scene.add(sprite)
      this._letters.push(sprite)
    }
  }

  public get name(): string {
    return this._name
  }

  public set name(value: string) {
    this._name = value.substring(0, MAX_LENGTH)
    for (let n = 0; n < MAX_LENGTH; ++n) {
      if (n < this._name.length && this._name[n] !== ' ') {
        const texture = letterTextures.get(this._name[n])
        if (texture == null) {
          throw new Error(`Unknown texture for char '${this._name[n]}'`)
        }
        this._letters[n].material.map = texture
        this._letters[n].visible = true
      } else {
        this._letters[n].visible = false
      }
    }
  }
}

class NameWithCheck {
  constructor(
    private readonly _name: Name,
    private readonly _button: Control,
  ) {}

  public get name(): string {
    return this._name.name
  }

  public set name(value: string) {
    this._name.name = value
    this._button.visible = value.length > 0
  }
}

export class RegBook extends World {
  private readonly _building = new Building()
  private _names: NameWithCheck[] = []
  private _highLightSprite: THREE.Sprite
  private readonly _highlightBlink = engine.createInterval(500)

  private _idleTimer: number | null = null
  private _leaving = false
  private _dialogueToken = 0
  private _infoman: Character | null = null
  private _dialogueAudio: Audio | null = null
  private _musicSentinel: Sentinel | null = null
  private _dialogueAbort: AbortController | null = null
  private _dialogueResolve: (() => void) | null = null

  constructor() {
    super('regbook')

    this._highLightSprite = createImageSprite(CheckHiLite_Bitmap)
    this._building.scene.add(this._highLightSprite)
    this._highLightSprite.visible = false
  }

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      backgroundMusic: InformationCenter_Music,
    })

    this._infoman = await this.getCharacter('infoman')
    this._names = []
    for (let n = 0; n < 10; ++n) {
      const controlName = `Check${n}_Ctl`
      const button = this._building.getControl(controlName)
      if (button == null) {
        throw new Error(`Control ${controlName} does not exist`)
      }
      this._names.push(new NameWithCheck(new Name(this._building.scene, X_OFFSET, Y_OFFSET + ROW_HEIGHT * n, CHAR_WIDTH), button))
    }

    this._building.onButtonClicked = (buttonName, event) => {
      if (this._leaving) {
        return true
      }
      this.resetIdleTimer()
      const check = /^Check([0-9])_Ctl$/.exec(buttonName)
      if (check != null) {
        const row = Number(check[1])
        this.loadSave(this._names[row].name)
        return true
      }
      const state = event.state
      switch (buttonName) {
        case 'Alphabet_Ctl':
          if (state >= 1 && state <= 26) {
            if (this._names[0].name.length < MAX_LENGTH) {
              const nextChar = letterActions[state - 1][0]
              this._names[0].name = this._names[0].name + nextChar
            }
          } else if (state === 27) {
            this.removeChar()
          } else if (state === 28) {
            this.leave(engine.currentSaveGame.act === 1 ? 'backToInfoAct1' : 'notRegistered')
          }
          return true
      }
      return false
    }
  }

  private loadSave = (name: string): void => {
    if (name.length === 0 || this._leaving) {
      return
    }
    getScoreHistory().update(engine.currentSaveGame)
    if (engine.currentSaveGame.isUnloaded || name !== engine.currentSaveGame.name) {
      engine.loadSaveGame(name)
    }
    this.leave('selectedSave')
  }

  private leave = (state: 'selectedSave' | 'backToInfoAct1' | 'notRegistered' | 'exitQueried'): void => {
    if (this._leaving) {
      return
    }
    this._leaving = true
    this._idleTimer = null
    this.stopDialogue()
    infocenterState.state = state
    void switchWorld({ ending: null })
  }

  private resetIdleTimer = (): void => {
    this._idleTimer = engine.elapsedTimeMilliseconds
  }

  private stopDialogue = (): void => {
    ++this._dialogueToken
    this._dialogueAbort?.abort()
    this._dialogueAbort = null
    this._dialogueResolve?.()
    this._dialogueResolve = null
    this._dialogueAudio?.stop()
    this._dialogueAudio = null
    this.skipAllRunningAnimations(true)
    if (this._musicSentinel != null) {
      engine.raiseBackgroundMusic(this._musicSentinel)
      this._musicSentinel = null
    }
  }

  private playDialogue = async (action: typeof iic006in_RunAnim | typeof iic007in_PlayWav | typeof iic008in_PlayWav): Promise<void> => {
    this.stopDialogue()
    const token = this._dialogueToken
    this._dialogueAbort = new AbortController()
    const signal = this._dialogueAbort.signal
    this._musicSentinel = engine.lowerBackgroundMusic()
    try {
      if (action.name === iic006in_RunAnim.name) {
        await this.playAnimation(action, { signal })
      } else {
        const audio = await engine.getAudio(action, 'speech')
        if (token !== this._dialogueToken || this._leaving) {
          return
        }
        this._dialogueAudio = audio
        await new Promise<void>(resolve => {
          this._dialogueResolve = resolve
          audio.onEnded = resolve
          audio.play()
        })
      }
    } finally {
      if (token === this._dialogueToken) {
        this._dialogueResolve = null
        this._dialogueAbort = null
        this._dialogueAudio = null
        if (this._musicSentinel != null) {
          engine.raiseBackgroundMusic(this._musicSentinel)
          this._musicSentinel = null
        }
        if (!this._leaving) {
          this.resetIdleTimer()
        }
      }
    }
  }

  public override activate(composer: Composer): void {
    this._building.activate(composer)
    super.activate(composer)
    this._leaving = false
    this._highLightSprite.visible = false
    this.resetIdleTimer()
    getScoreHistory().update(engine.currentSaveGame)
    const saveGameNames = engine.saveGameNames
    for (let n = 0; n < 10; ++n) {
      this._names[n].name = n > 0 && n <= saveGameNames.length ? saveGameNames[n - 1] : ''
    }
    const registered = !engine.currentSaveGame.isUnloaded
    void this.playDialogue(registered ? iic008in_PlayWav : iic006in_RunAnim)
    if (this._infoman != null) {
      this._infoman.visible = !registered
    }
  }

  public override deactivate(): void {
    this._leaving = true
    this._idleTimer = null
    this.stopDialogue()
    super.deactivate()
  }

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    if (this._leaving) {
      return
    }
    this.resetIdleTimer()
    if (this._building.pointerDown(event.normalizedX, event.normalizedY)) {
      return
    }
    await super.pointerDown(event)
  }

  public override pointerUp(_event: NormalizedMouseEvent): void {
    this._building.pointerUp()
  }

  private removeChar(): void {
    if (this._names[0].name.length > 0) {
      this._names[0].name = this._names[0].name.substring(0, this._names[0].name.length - 1)
    }
    if (this._names[0].name.length === 0) {
      this._highLightSprite.visible = false
    }
  }

  public override keyDown(event: KeyboardEvent): void {
    if (this._leaving || event.repeat) {
      return
    }
    this.resetIdleTimer()
    if (event.key === 'Backspace') {
      event.preventDefault()
      this.removeChar()
    } else if (event.key === 'Escape') {
      this.leave('exitQueried')
    }
  }

  public override keyPressed(key: string): void {
    if (this._leaving) {
      return
    }
    this.resetIdleTimer()
    if (key === ' ') {
      this.stopDialogue()
      return
    }
    const upper = key.toUpperCase()
    if (/^[A-Z]$/.test(upper) && this._names[0].name.length < MAX_LENGTH) {
      this._names[0].name += upper
    }
  }

  public override update(delta: number): void {
    super.update(delta)
    if (this._idleTimer != null && !this._leaving && engine.elapsedTimeMilliseconds - this._idleTimer >= 30_000) {
      this._idleTimer = null
      void this.playDialogue(iic007in_PlayWav)
    }
    if (this._highlightBlink.resetExpired() && this._names[0].name.length > 0) {
      this._highLightSprite.visible = !this._highLightSprite.visible
    }
  }
}
