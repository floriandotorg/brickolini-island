import * as THREE from 'three'
import { type ColorName, type ColorTableName, ColorTableNames, getDefaultColor, isColorName } from './assets/mesh'
import { NUM_ORIGINAL_LIGHTS } from './original-lights'
import { type VehicleType, VehicleTypes } from './world/dashboard'

export const PlayerCharacters = ['pepper', 'papa', 'mama', 'nick', 'laura'] as const
export type PlayerCharacter = (typeof PlayerCharacters)[number]

export type VehiclePlacement = { position: THREE.Vector3; quaternion: THREE.Quaternion }

export const SAVE_GAME_STORAGE_KEY = 'saves'

export class SaveGame {
  private _player: PlayerCharacter | null = null
  private _sunPosition: number = 3
  private _colorTable = new Map<ColorTableName, ColorName>()
  private _vehiclePlacements = new Map<VehicleType, VehiclePlacement>()
  private _vehicleProgress = new Map<VehicleType, number>()

  private static readonly PlayerKey = 'player'
  private static readonly ColorKey = 'color'
  private static readonly SunPositionKey = 'sun'
  private static readonly VehiclePlacementKey = ['vehicle', 'placement']
  private static readonly VehicleProgressKey = ['vehicle', 'progress']

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

  public get sunPosition(): number {
    return this._sunPosition
  }

  public nextSunPosition(): void {
    this._sunPosition = (this._sunPosition + 1) % NUM_ORIGINAL_LIGHTS
    this.setItem(this._sunPosition, SaveGame.SunPositionKey)
  }

  public prevSunPosition(): void {
    this._sunPosition--
    if (this._sunPosition < 0) {
      this._sunPosition = NUM_ORIGINAL_LIGHTS - 1
    }
    this.setItem(this._sunPosition, SaveGame.SunPositionKey)
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

  public getVehiclePlacement(type: VehicleType): VehiclePlacement | null {
    return this._vehiclePlacements.get(type) ?? null
  }

  public setVehiclePlacement(type: VehicleType, placement: VehiclePlacement): void {
    this._vehiclePlacements.set(type, placement)
    const elements = placement.position.toArray().concat(placement.quaternion.toArray())
    const json = JSON.stringify(elements)
    this.setItem(json, ...SaveGame.VehiclePlacementKey, type)
  }

  public getVehicleProgress(type: VehicleType): number {
    return this._vehicleProgress.get(type) ?? 0
  }

  public setVehicleProgress(type: VehicleType, progress: number): void {
    this._vehicleProgress.set(type, progress)
    this.setItem(progress, ...SaveGame.VehicleProgressKey, type)
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

    const sunPosition = Number.parseFloat(this.getItem(SaveGame.SunPositionKey) ?? '3')
    if (Number.isInteger(sunPosition) && sunPosition >= 0 && sunPosition < NUM_ORIGINAL_LIGHTS) {
      this._sunPosition = sunPosition
    }

    const VECTOR3_COUNT = 3
    const QUATERNION_COUNT = 4
    for (const vehicle of VehicleTypes) {
      const placementJson = this.getItem(...SaveGame.VehiclePlacementKey, vehicle)
      if (placementJson != null) {
        const jsonResult = JSON.parse(placementJson)
        if (Array.isArray(jsonResult) && jsonResult.length === VECTOR3_COUNT + QUATERNION_COUNT && jsonResult.every(name => typeof name === 'number')) {
          const position = new THREE.Vector3()
          position.fromArray(jsonResult)
          const quaternion = new THREE.Quaternion()
          quaternion.fromArray(jsonResult, VECTOR3_COUNT)
          this._vehiclePlacements.set(vehicle, { position, quaternion })
        }
      }

      const progress = Number.parseInt(this.getItem(...SaveGame.VehicleProgressKey, vehicle) ?? '0', 10)
      if (Number.isInteger(progress) && progress >= 0) {
        this._vehicleProgress.set(vehicle, progress)
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

  private getItem(...names: string[]): string | null {
    return localStorage.getItem(`${SAVE_GAME_STORAGE_KEY}.${this.name}.${names.join('.')}`)
  }

  private setItem(value: string | number | null, ...names: string[]): void {
    if (this.isUnloaded) {
      return
    }

    const key = `${SAVE_GAME_STORAGE_KEY}.${this.name}.${names.join('.')}`
    if (value != null) {
      const stringValue = typeof value === 'number' ? value.toString() : value
      localStorage.setItem(key, stringValue)
    } else {
      localStorage.removeItem(key)
    }
  }
}
