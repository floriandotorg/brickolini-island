import type * as THREE from 'three'
import { InformationCenter_Music } from '../actions/jukebox'
import { _StartUp, A_Bitmap, B_Bitmap, C_Bitmap, D_Bitmap, E_Bitmap, F_Bitmap, G_Bitmap, H_Bitmap, I_Bitmap, J_Bitmap, K_Bitmap, L_Bitmap, M_Bitmap, N_Bitmap, O_Bitmap, P_Bitmap, Q_Bitmap, R_Bitmap, S_Bitmap, T_Bitmap, U_Bitmap, V_Bitmap, W_Bitmap, X_Bitmap, Y_Bitmap, Z_Bitmap } from '../actions/regbook'
import type { ImageAction } from '../lib/action-types'
import { createNormalizedSprite } from '../lib/assets/canvas-sprite'
import { createTexture } from '../lib/assets/texture'
import type { Composer } from '../lib/effect/composer'
import { engine } from '../lib/engine'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
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
  private _name: string = ''
  private _letters: THREE.Sprite[]

  constructor(scene: THREE.Scene, x: number, y: number, charWidth: number) {
    this._letters = []
    for (let i = 0; i < MAX_LENGTH; i++) {
      const sprite = createNormalizedSprite(x + charWidth * i, y, -0.25, A_Bitmap.dimensions.width, A_Bitmap.dimensions.height)
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
    for (let i = 0; i < MAX_LENGTH; i++) {
      if (i < value.length && value[i] !== ' ') {
        const texture = letterTextures.get(value[i])
        if (texture == null) {
          throw new Error(`Unknown texture for char '${value[i]}'`)
        }
        this._letters[i].material.map = texture
        this._letters[i].visible = true
      } else {
        this._letters[i].visible = false
      }
    }
  }
}

export class RegBook extends World {
  private _building = new Building()
  private _names: Name[] = []

  constructor() {
    super('regbook')
  }

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      backgroundMusic: InformationCenter_Music,
    })

    this._names = []
    for (let row = 0; row < 10; row++) {
      this._names.push(new Name(this._building.scene, X_OFFSET, Y_OFFSET + ROW_HEIGHT * row, CHAR_WIDTH))
    }

    this._building.onButtonClicked = (buttonName, state) => {
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
            void switchWorld('infomain')
          }
          return true
        case 'Check0_Ctl':
          this.loadSave(this._names[0].name)
          engine.storeSaveGames()
          return true
        case 'Check1_Ctl':
          this.loadSave(engine.saveGameNames[0])
          return true
        case 'Check2_Ctl':
          this.loadSave(engine.saveGameNames[1])
          return true
        case 'Check3_Ctl':
          this.loadSave(engine.saveGameNames[2])
          return true
        case 'Check4_Ctl':
          this.loadSave(engine.saveGameNames[3])
          return true
        case 'Check5_Ctl':
          this.loadSave(engine.saveGameNames[4])
          return true
        case 'Check6_Ctl':
          this.loadSave(engine.saveGameNames[5])
          return true
        case 'Check7_Ctl':
          this.loadSave(engine.saveGameNames[6])
          return true
        case 'Check8_Ctl':
          this.loadSave(engine.saveGameNames[7])
          return true
        case 'Check9_Ctl':
          this.loadSave(engine.saveGameNames[8])
          return true
      }
      return false
    }
  }

  private loadSave(name?: string) {
    if (name != null && name.length > 0) {
      engine.loadSaveGame(name)
      void switchWorld('infomain')
    }
  }

  public override activate(composer: Composer): void {
    this._building.activate(composer)
    super.activate(composer)
    const saveGameNames = engine.saveGameNames
    for (let row = 0; row < 10; row++) {
      this._names[row].name = row > 0 && row <= saveGameNames.length ? saveGameNames[row - 1] : ''
    }
  }

  public override pointerDown(_event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._building.pointerDown(normalizedX, normalizedY)
  }

  public override pointerUp(_event: MouseEvent): void {
    this._building.pointerUp()
  }

  private removeChar(): void {
    if (this._names[0].name.length > 0) {
      this._names[0].name = this._names[0].name.substring(0, this._names[0].name.length - 1)
    }
  }

  public override keyDown(_event: KeyboardEvent): void {
    if (_event.key === 'Backspace') {
      this.removeChar()
    }
  }

  public override keyPressed(key: string): void {
    const upper = key.toUpperCase()
    if (letterActions.find(entry => entry[0] === upper) != null) {
      this._names[0].name = this._names[0].name + upper
      return
    }

    super.keyPressed(key)
  }
}
