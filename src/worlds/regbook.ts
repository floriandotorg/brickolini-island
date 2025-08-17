import type * as THREE from 'three'
import { InformationCenter_Music } from '../actions/jukebox'
import { _StartUp, A_Bitmap, B_Bitmap, C_Bitmap, D_Bitmap, E_Bitmap, F_Bitmap, G_Bitmap, H_Bitmap, I_Bitmap, J_Bitmap, K_Bitmap, L_Bitmap, M_Bitmap, N_Bitmap, O_Bitmap, P_Bitmap, Q_Bitmap, R_Bitmap, S_Bitmap, T_Bitmap, U_Bitmap, V_Bitmap, W_Bitmap, X_Bitmap, Y_Bitmap, Z_Bitmap } from '../actions/regbook'
import type { ImageAction } from '../lib/action-types'
import { createNormalizedSprite } from '../lib/assets/canvas-sprite'
import { createTexture } from '../lib/assets/texture'
import type { Composer } from '../lib/effect/composer'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { World } from '../lib/world/world'

const CHAR_WIDTH = 23
const X_OFFSET = 343
const Y_OFFSET = 121

export class RegBook extends World {
  private _building = new Building()
  private _newName = ''
  private _letterTextures = new Map<string, THREE.Texture>()
  private _letters: THREE.Sprite[] = []

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
      this._letterTextures.set(letter, createTexture(action))
    }

    this._letters = []
    for (let i = 0; i < 7; i++) {
      const sprite = createNormalizedSprite(X_OFFSET + CHAR_WIDTH * i, Y_OFFSET, -0.25, A_Bitmap.dimensions.width, A_Bitmap.dimensions.height)
      sprite.visible = false
      this._building.scene.add(sprite)
      this._letters.push(sprite)
    }

    this._building.onButtonClicked = (buttonName, state) => {
      switch (buttonName) {
        case 'Alphabet_Ctl':
          if (state >= 1 && state <= 26) {
            if (this._newName.length < 7) {
              const nextChar = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[state - 1]
              const texture = this._letterTextures.get(nextChar)
              if (texture == null) {
                throw new Error(`Unknown texture for char '${nextChar}'`)
              }
              this._letters[this._newName.length].material.map = texture
              this._letters[this._newName.length].visible = true
              this._newName += nextChar
            }
          } else if (state === 27) {
            if (this._newName.length > 0) {
              this._newName = this._newName.substring(0, this._newName.length - 1)
              this._letters[this._newName.length].visible = false
            }
          } else if (state === 28) {
            void switchWorld('infomain')
          }
          return true
      }
      return false
    }
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
