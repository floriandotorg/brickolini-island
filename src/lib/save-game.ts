import * as THREE from 'three'
import { type ColorName, type ColorTableName, ColorTableNames, getDefaultColor, isColorName } from './color-table.ts'
import { NUM_ORIGINAL_LIGHTS } from './original-lights.ts'
import { type ScoreColor, type ScoreMission, scoreColorValue } from './score.ts'
import { getScoreHistory } from './score-history.ts'
import { type VehicleType, VehicleTypes } from './vehicle-types.ts'

export const PlayerCharacters = ['pepper', 'papa', 'mama', 'nick', 'laura'] as const
export type PlayerCharacter = (typeof PlayerCharacters)[number]
const isPlayerCharacter = (value: string): value is PlayerCharacter => PlayerCharacters.some(player => player === value)

export type VehiclePlacement = { position: THREE.Vector3; quaternion: THREE.Quaternion }

export const SAVE_GAME_STORAGE_KEY = 'saves'

export type BuildState = { introductionCounter: number; finishedBuild: boolean; playedExitScript: boolean }
export type CharacterVariant = { sound: number; move: number; mood: number; hatPart: number; hatColor: number; torsoColor: number; armLeftColor: number; armRightColor: number; legLeftColor: number; legRightColor: number }
export type PlantState = { variant: 0 | 1 | 2 | 3; color: 0 | 1 | 2 | 3 | 4; sound: number; move: number; mood: number; counter: number }
export type BuildingState = { entries: { sound: number; move: number; mood: number; counter: number }[]; nextVariant: number }
export type AnimationState = { extraCharacterId: number; playCounts: number[]; locationsPlayed: boolean[] }
export const VehicleTextureSlots = ['chwind', 'chjetl', 'chjetr', 'jsfrnt', 'jswnsh', 'dbfrfn', 'rcfrnt', 'rcback', 'rctail'] as const
export type VehicleTextureSlot = (typeof VehicleTextureSlots)[number]
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value)
const hasIntegers = <K extends string>(value: unknown, keys: readonly K[]): value is Record<K, number> => isRecord(value) && keys.every(key => isInteger(value[key]))
const characterKeys = ['sound', 'move', 'mood', 'hatPart', 'hatColor', 'torsoColor', 'armLeftColor', 'armRightColor', 'legLeftColor', 'legRightColor'] as const
const plantKeys = ['variant', 'color', 'sound', 'move', 'mood', 'counter'] as const
const buildingKeys = ['sound', 'move', 'mood', 'counter'] as const
const isPlant = (value: unknown): value is PlantState => hasIntegers(value, plantKeys) && value.variant >= 0 && value.variant <= 3 && value.color >= 0 && value.color <= 4

export class SaveGame {
  private _player: PlayerCharacter | null = null
  private _sunPosition = 2
  private _colorTable = new Map<ColorTableName, ColorName>()
  private _vehiclePlacements = new Map<VehicleType, VehiclePlacement>()
  private _vehicleProgress = new Map<VehicleType, number>()
  private _playedExitExplanation = false
  private _savedPreviousArea: string | null = null

  private static readonly PlayerKey = 'player'
  private static readonly ColorKey = 'color'
  private static readonly SunPositionKey = 'sun'
  private static readonly VehiclePlacementKey = ['vehicle', 'placement']
  private static readonly VehicleProgressKey = ['vehicle', 'progress']
  private static readonly PlayedExitExplanationKey = 'playedExitExplanation'
  private static readonly HospitalVisitCountKey = ['hospital', 'visit']

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

  public getHospitalVisitCount(player: PlayerCharacter): number {
    return this.getInt(0, 0, 5, ...SaveGame.HospitalVisitCountKey, player)
  }

  public setHospitalVisitCount(player: PlayerCharacter, value: number): void {
    this.setItem(Math.max(0, Math.min(5, value)), ...SaveGame.HospitalVisitCountKey, player)
  }

  public getAmbulanceHighScore(player: PlayerCharacter): number {
    return this.getHighScore('ambulance', player)
  }

  public setAmbulanceHighScore(player: PlayerCharacter, value: number): void {
    this.setItem(Math.max(this.getHighScore('ambulance', player), value), 'score', 'ambulance', 'high', player)
    getScoreHistory().update(this)
  }

  public getAmbulanceCurrentScore(player: PlayerCharacter): number {
    return this.getScore('ambulance', player)
  }

  public setAmbulanceCurrentScore(player: PlayerCharacter, value: number): void {
    this.setItem(value, 'score', 'ambulance', 'current', player)
  }

  public get playedExitExplanation(): boolean {
    return this._playedExitExplanation
  }

  public set playedExitExplanation(value: boolean) {
    this._playedExitExplanation = value
    this.setItem(value, SaveGame.PlayedExitExplanationKey)
  }

  public get sunPosition(): number {
    return this._sunPosition
  }

  public nextSunPosition(): void {
    this._sunPosition = Math.min(this._sunPosition + 1, NUM_ORIGINAL_LIGHTS - 1)
    this.setItem(this._sunPosition, SaveGame.SunPositionKey)
  }

  public prevSunPosition(): void {
    this._sunPosition = Math.max(this._sunPosition - 1, 0)
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

  public get playerId(): number {
    return this.getInt(-1, -1, Number.MAX_SAFE_INTEGER, 'playerId')
  }

  public ensurePlayerId = (): void => {
    if (!this.isUnloaded && this.playerId < 0) {
      this.setItem(getScoreHistory().allocatePlayerId(), 'playerId')
    }
  }

  public get act(): 1 | 2 | 3 {
    const value = this.getInt(1, 1, 3, 'act')
    return value === 2 || value === 3 ? value : 1
  }

  public set act(value: 1 | 2 | 3) {
    this.setItem(value, 'act')
  }

  public get savedPreviousArea(): string | null {
    return this._savedPreviousArea
  }

  public set savedPreviousArea(value: string | null) {
    this._savedPreviousArea = value
    this.setItem(value, 'savedPreviousArea')
  }

  public getScore = (mission: ScoreMission, player: PlayerCharacter): number => this.getScoreValue(mission, player, 'current')
  public getHighScore = (mission: ScoreMission, player: PlayerCharacter): number => this.getScoreValue(mission, player, 'high')

  private getScoreValue = (mission: ScoreMission, player: PlayerCharacter, kind: 'current' | 'high'): number => {
    const fallback = mission === 'ambulance' ? this.getInt(0, 0, 3, 'ambulance', kind, player) : 0
    return this.getInt(fallback, 0, 3, 'score', mission, kind, player)
  }

  public recordScore = (mission: ScoreMission, player: PlayerCharacter, color: ScoreColor): void => {
    const score = scoreColorValue(color)
    this.setItem(score, 'score', mission, 'current', player)
    this.setItem(Math.max(score, this.getHighScore(mission, player)), 'score', mission, 'high', player)
    getScoreHistory().update(this)
  }

  public getPizzeriaPlaylist = (player: PlayerCharacter): number => this.getInt(0, 0, 2, 'pizzeria', 'playlist', player)
  public setPizzeriaPlaylist = (player: PlayerCharacter, value: number): void => this.setItem(Math.max(0, Math.min(2, value)), 'pizzeria', 'playlist', player)
  public getPizzaCounter = (player: PlayerCharacter): number => this.getInt(1, 1, Number.MAX_SAFE_INTEGER, 'pizza', 'counter', player)
  public setPizzaCounter = (player: PlayerCharacter, value: number): void => this.setItem(value, 'pizza', 'counter', player)
  public getGasStationVisitCount = (player: PlayerCharacter): number => this.getInt(0, 0, 5, 'gasstation', 'visit', player)
  public setGasStationVisitCount = (player: PlayerCharacter, value: number): void => this.setItem(Math.max(0, Math.min(5, value)), 'gasstation', 'visit', player)

  public get policeNextAnimation(): 'nps001ni' | 'nps002la' {
    const value = this.getItem('police', 'nextAnimation')
    if (value === 'nps001ni' || value === 'nps002la') {
      return value
    }
    const next = Math.random() < 0.5 ? 'nps001ni' : 'nps002la'
    this.policeNextAnimation = next
    return next
  }

  public set policeNextAnimation(value: 'nps001ni' | 'nps002la') {
    this.setItem(value, 'police', 'nextAnimation')
  }

  public getBuildState = (type: VehicleType): BuildState =>
    this.getJson((value): value is BuildState => isRecord(value) && isInteger(value.introductionCounter) && value.introductionCounter >= 0 && typeof value.finishedBuild === 'boolean' && typeof value.playedExitScript === 'boolean', { introductionCounter: 0, finishedBuild: false, playedExitScript: false }, 'build', type)
  public setBuildState = (type: VehicleType, value: BuildState): void => this.setJson(value, 'build', type)
  public getVehicleTexture = (slot: VehicleTextureSlot): string | null => this.getItem('vehicle', 'texture', slot)
  public setVehicleTexture = (slot: VehicleTextureSlot, value: string | null): void => this.setItem(value, 'vehicle', 'texture', slot)
  public clearVehiclePlacement = (type: VehicleType): void => {
    this._vehiclePlacements.delete(type)
    this.setItem(null, ...SaveGame.VehiclePlacementKey, type)
  }

  public get backgroundColor(): { h: number; s: number; v: number } {
    return this.getJson((value): value is { h: number; s: number; v: number } => isRecord(value) && ['h', 's', 'v'].every(key => typeof value[key] === 'number' && value[key] >= 0 && value[key] <= 1), { h: 0.56, s: 0.54, v: 0.68 }, 'backgroundColor')
  }

  public set backgroundColor(value: { h: number; s: number; v: number }) {
    this.setJson(value, 'backgroundColor')
  }

  public get cptClickDialogueIndex(): number {
    return this.getInt(0, 0, 2, 'cptClickDialogueIndex')
  }

  public set cptClickDialogueIndex(value: number) {
    this.setItem(value, 'cptClickDialogueIndex')
  }

  public get anim(): AnimationState {
    return this.getJson(
      (value): value is AnimationState =>
        isRecord(value) && isInteger(value.extraCharacterId) && value.extraCharacterId >= 0 && Array.isArray(value.playCounts) && value.playCounts.every(count => isInteger(count) && count >= 0) && Array.isArray(value.locationsPlayed) && value.locationsPlayed.every(played => typeof played === 'boolean'),
      { extraCharacterId: 0, playCounts: [], locationsPlayed: [] },
      'anim',
    )
  }

  public set anim(value: AnimationState) {
    this.setJson(value, 'anim')
  }

  public getCharacterVariant = (name: string): CharacterVariant | null => {
    const characters = this.getJson(isRecord, {}, 'characters')
    const value = characters[name]
    return hasIntegers(value, characterKeys) ? value : null
  }

  public setCharacterVariant = (name: string, value: CharacterVariant): void => {
    const characters = this.getJson(isRecord, {}, 'characters')
    this.setJson({ ...characters, [name]: value }, 'characters')
  }

  public get plants(): PlantState[] | null {
    return this.getJson((value): value is PlantState[] => Array.isArray(value) && value.length === 81 && value.every(isPlant), null, 'plants')
  }

  public set plants(value: PlantState[] | null) {
    this.setJson(value, 'plants')
  }

  public get buildings(): BuildingState | null {
    return this.getJson((value): value is BuildingState => isRecord(value) && isInteger(value.nextVariant) && Array.isArray(value.entries) && value.entries.length === 16 && value.entries.every(entry => hasIntegers(entry, buildingKeys)), null, 'buildings')
  }

  public set buildings(value: BuildingState | null) {
    this.setJson(value, 'buildings')
  }

  private getInt = (fallback: number, min: number, max: number, ...path: string[]): number => {
    const raw = this.getItem(...path)
    const value = raw === null || raw.trim() === '' ? Number.NaN : Number(raw)
    return Number.isSafeInteger(value) && value >= min && value <= max ? value : fallback
  }

  private getJson = <T>(guard: (value: unknown) => value is T, fallback: T, ...path: string[]): T => {
    try {
      const value: unknown = JSON.parse(this.getItem(...path) ?? 'null')
      return guard(value) ? value : fallback
    } catch {
      return fallback
    }
  }

  private setJson = (value: unknown, ...path: string[]): void => this.setItem(JSON.stringify(value), ...path)

  public static delete = (name: string): void => {
    const prefix = `${SAVE_GAME_STORAGE_KEY}.${name.toUpperCase()}.`
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key)
      }
    }
  }

  public readonly name: string

  private constructor(name: string) {
    this.name = name
    if (!this.isUnloaded) {
      localStorage.removeItem('gameState.plantStates')
    }

    const playerName = this.isUnloaded ? new URLSearchParams(window.location.search).get('player') : this.getItem(SaveGame.PlayerKey)
    if (playerName != null) {
      if (isPlayerCharacter(playerName)) {
        this.player = playerName
      } else {
        console.warn(`Unknown player character ${playerName}`)
      }
    }

    this._savedPreviousArea = this.act === 1 ? null : this.getItem('savedPreviousArea')
    this._playedExitExplanation = this.getItem(SaveGame.PlayedExitExplanationKey) === 'true'

    for (const name of ColorTableNames) {
      const colorValue = this.getItem(SaveGame.ColorKey, name)
      if (colorValue != null && isColorName(colorValue)) {
        this._colorTable.set(name, colorValue)
      }
    }

    const sunPosition = this.getInt(2, 0, NUM_ORIGINAL_LIGHTS - 1, SaveGame.SunPositionKey)
    if (Number.isInteger(sunPosition) && sunPosition >= 0 && sunPosition < NUM_ORIGINAL_LIGHTS) {
      this._sunPosition = sunPosition
    }

    const VECTOR3_COUNT = 3
    const QUATERNION_COUNT = 4
    for (const vehicle of VehicleTypes) {
      const placementJson = this.getItem(...SaveGame.VehiclePlacementKey, vehicle)
      if (placementJson != null) {
        const jsonResult = this.getJson((value): value is number[] => Array.isArray(value) && value.every(element => typeof element === 'number' && Number.isFinite(element)), [], ...SaveGame.VehiclePlacementKey, vehicle)
        if (Array.isArray(jsonResult) && jsonResult.length === VECTOR3_COUNT + QUATERNION_COUNT && jsonResult.every(name => typeof name === 'number')) {
          const position = new THREE.Vector3()
          position.fromArray(jsonResult)
          const quaternion = new THREE.Quaternion()
          quaternion.fromArray(jsonResult, VECTOR3_COUNT)
          this._vehiclePlacements.set(vehicle, { position, quaternion })
        }
      }

      const progress = this.getInt(0, 0, Number.MAX_SAFE_INTEGER, ...SaveGame.VehicleProgressKey, vehicle)
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
    return this.isUnloaded ? null : localStorage.getItem(`${SAVE_GAME_STORAGE_KEY}.${this.name}.${names.join('.')}`)
  }

  private setItem(value: string | boolean | number | null, ...names: string[]): void {
    if (this.isUnloaded) {
      return
    }

    const key = `${SAVE_GAME_STORAGE_KEY}.${this.name}.${names.join('.')}`
    if (value != null) {
      const stringValue = typeof value === 'number' ? value.toString() : typeof value === 'boolean' ? value.toString() : value
      localStorage.setItem(key, stringValue)
    } else {
      localStorage.removeItem(key)
    }
  }
}
