import { type ColorName, type ColorTableName, ColorTableNames, getDefaultColor, isColorName } from './assets/mesh'

export const PlayerCharacters = ['pepper', 'papa', 'mama', 'nick', 'laura'] as const
export type PlayerCharacter = (typeof PlayerCharacters)[number]

export const SAVE_GAME_STORAGE_KEY = 'saves'

export class SaveGame {
  private _player: PlayerCharacter | null = null
  private _colorTable = new Map<ColorTableName, ColorName>()

  public get playerUnsafe(): PlayerCharacter | null {
    return this._player
  }

  public get player(): PlayerCharacter {
    if (this._player == null) {
      throw new Error('Current player character is null')
    }
    return this._player
  }

  public set player(character: PlayerCharacter) {
    this._player = character
    this.setItem(this.playerUnsafe, SaveGame.PlayerKey)
  }

  public get isUnloaded(): boolean {
    return this.name.length === 0
  }

  public getColor(name: ColorTableName): ColorName {
    const customColor = this._colorTable.get(name)
    if (customColor != null) {
      return customColor
    }
    return getDefaultColor(name)
  }

  public setColor(name: ColorTableName, color: ColorName): void {
    this._colorTable.set(name, color)
    this.setItem(color, SaveGame.ColorKey, name)
  }

  public readonly name: string

  private constructor(name: string) {
    this.name = name

    const playerName = this.isUnloaded ? new URLSearchParams(window.location.search).get('player') : this.getItem(SaveGame.PlayerKey)
    if (playerName != null) {
      if (PlayerCharacters.includes(playerName as PlayerCharacter)) {
        this.player = playerName as PlayerCharacter
      } else {
        console.warn(`Unknown player character ${playerName}`)
      }
    }

    for (const name of ColorTableNames) {
      const colorValue = this.getItem(SaveGame.ColorKey, name)
      if (colorValue != null && isColorName(colorValue)) {
        this._colorTable.set(name, colorValue)
      }
    }
  }

  public static readonly UnloadedSave: SaveGame = new SaveGame('')

  public static create(name: string): SaveGame {
    if (!SaveGame.validName(name)) {
      throw new Error('Name must be alphanumeric')
    }
    name = name.toUpperCase()
    return new SaveGame(name)
  }

  public static validName = (name: string) => /^[A-Z0-9]+$/.test(name.toUpperCase())

  private static readonly PlayerKey = 'player'
  private static readonly ColorKey = 'color'

  private getItem(...names: string[]): string | null {
    return localStorage.getItem(`${SAVE_GAME_STORAGE_KEY}.${this.name}.${names.join('.')}`)
  }

  private setItem(value: string | null, ...names: string[]): void {
    if (this.isUnloaded) {
      return
    }

    const key = `${SAVE_GAME_STORAGE_KEY}.${this.name}.${names.join('.')}`
    if (value != null) {
      localStorage.setItem(key, value)
    } else {
      localStorage.removeItem(key)
    }
  }
}
