import * as THREE from 'three'
import type { AudioAction, CompositeMediaAction } from './action-types'
import { type Audio, getAudio } from './assets/audio'
import { getActionFileUrl } from './assets/load'
import { Composer, Render2D } from './effect/composer'
import { FilmGrainEffect } from './effect/film-grain'
import { MosaicEffect } from './effect/mosaic'
import { SAVE_GAME_STORAGE_KEY, SaveGame } from './save-game'
import { getSettings } from './settings'
import type { VehicleType } from './world/dashboard'
import type { World } from './world/world'

export const RESOLUTION_RATIO = 4 / 3
const BACKGROUND_MUSIC_FADE_TIME = 2
const BACKGROUND_MUSIC_FADE_TIME_SETTINGS = 0.5

export const ORIGINAL_TOTAL_WIDTH: number = 640
export const ORIGINAL_TOTAL_HEIGHT: number = 480

export const getURLParam = (name: string): string | null => new URLSearchParams(window.location.search).get(name)

export const normalizePoint = (x: number, y: number, totalSize: [number, number] = [ORIGINAL_TOTAL_WIDTH, ORIGINAL_TOTAL_HEIGHT]): [number, number] => {
  const normalizedX = (x / totalSize[0]) * 2 - 1
  const normalizedY = -((y / totalSize[1]) * 2 - 1)
  return [normalizedX, normalizedY]
}

export class NormalizedRect {
  public constructor(
    public readonly normalizedX: number,
    public readonly normalizedY: number,
    public readonly normalizedWidth: number,
    public readonly normalizedHeight: number,
  ) {}

  public inside(normalizedX: number, normalizedY: number): boolean {
    const [rectX, rectY] = this.relative(normalizedX, normalizedY)
    return rectX >= 0 && rectY <= 0 && rectX <= this.normalizedWidth && rectY >= -this.normalizedHeight
  }

  public relative(normalizedX: number, normalizedY: number): [number, number] {
    const rectX = normalizedX - this.normalizedX
    const rectY = normalizedY - this.normalizedY
    return [rectX, rectY]
  }

  public renormalize(normalizedX: number, normalizedY: number): [number, number] | null {
    if (!this.inside(normalizedX, normalizedY)) {
      return null
    }
    const [rectX, rectY] = this.relative(normalizedX, normalizedY)
    const x = rectX / this.normalizedWidth
    const y = -rectY / this.normalizedHeight
    return [x, y]
  }
}

export const normalizeRect = (x: number, y: number, w: number, h: number, totalSize: [number, number] = [ORIGINAL_TOTAL_WIDTH, ORIGINAL_TOTAL_HEIGHT]): NormalizedRect => {
  const [normalizedX, normalizedY] = normalizePoint(x, y, totalSize)
  const normalizedWidth = (w / totalSize[0]) * 2
  const normalizedHeight = (h / totalSize[1]) * 2
  return new NormalizedRect(normalizedX, normalizedY, normalizedWidth, normalizedHeight)
}

export const AudioTypes = ['music', 'effects', 'speech', 'animations', 'cutscene'] as const
export type AudioType = (typeof AudioTypes)[number]

export type Timeout = {
  get isExpired(): boolean
  get millisecondsSinceStart(): number
}

export type Interval = Timeout & {
  resetExpired: () => boolean
}

export type Sentinel = symbol & { __brand: 'Sentinel' }

export type NormalizedMouseEvent = {
  normalizedX: number
  normalizedY: number
}

const createNormalizedMouseEvent = (event: MouseEvent, canvas: HTMLCanvasElement): NormalizedMouseEvent => {
  const rect = canvas.getBoundingClientRect()
  const [normalizedX, normalizedY] = normalizePoint(event.clientX - rect.left, event.clientY - rect.top, [rect.width, rect.height])

  return { normalizedX, normalizedY }
}

class Engine {
  private _state: 'cutscene' | 'transition' | 'game' = 'game'
  private _clock: THREE.Clock = new THREE.Clock()
  private _cutsceneVideo: HTMLVideoElement
  private _cutsceneAudio: Audio | null = null
  private _canvas: HTMLCanvasElement
  private _audioListener = new THREE.AudioListener()
  private _renderer: THREE.WebGLRenderer
  private _composer: Composer
  private _mosaicEffect = new MosaicEffect()
  private _cutsceneComposer: Composer
  private _cutsceneRender = new Render2D()
  private _cutsceneMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2))
  private _world: World | null = null
  private _keyStates: Set<string> = new Set()
  private _backgroundAudio: { actionId: number; audio: Audio } | null = null
  private _transitionStart = 0
  private _transitionPromiseResolve: (() => void) | null = null
  private _currentSaveGame = SaveGame.UnloadedSave
  private readonly _gains: Record<AudioType, GainNode>
  private readonly _backgroundLowerGain: GainNode
  private readonly _backgroundLowerSentinels = new Set<Sentinel>()
  private readonly _respawnVehicle = new Set<VehicleType>()

  public debugMode = false
  public readonly saveGameNames: string[]

  public get currentPlayerMask(): number {
    const currentPlayerId = this.currentPlayerId
    if (currentPlayerId < 1) {
      return 0
    }

    return 1 << (currentPlayerId - 1)
  }

  public get currentPlayerId(): number {
    switch (this.currentSaveGame.playerUnsafe) {
      case null:
        return 0
      case 'pepper':
        return 1
      case 'mama':
        return 2
      case 'papa':
        return 3
      case 'nick':
        return 4
      case 'laura':
        return 5
    }

    const _exhaustiveCheck: never = this.currentSaveGame.playerUnsafe
    throw new Error('Invalid player character')
  }

  public get hasBuiltHelicopter(): boolean {
    return false
  }

  public get currentSaveGame(): SaveGame {
    return this._currentSaveGame
  }

  private set currentSaveGame(saveGame: SaveGame) {
    this.saveGameNames.splice(0, 0, saveGame.name)
    this._currentSaveGame = saveGame
  }

  public loadSaveGame(name: string): void {
    for (const [index, saveGameName] of this.saveGameNames.entries()) {
      if (saveGameName.toUpperCase() === name.toUpperCase()) {
        this.saveGameNames.splice(index, 1)
        break
      }
    }
    this.currentSaveGame = SaveGame.create(name)
  }

  public storeSaveGames(): void {
    localStorage.setItem(SAVE_GAME_STORAGE_KEY, JSON.stringify(this.saveGameNames))
  }

  public async switchBackgroundMusic(action: AudioAction): Promise<void> {
    if (this._backgroundAudio?.actionId === action.id) {
      return
    }

    const audio = await this.getAudio(action, 'music')
    // not every track has looping enabled from the action unfortunately
    audio.loop = true
    const sourceVolume = action.volume / 100

    if (this._backgroundAudio == null) {
      this._backgroundAudio = { actionId: action.id, audio }
      this._backgroundAudio.audio.gain.value = sourceVolume
      this._backgroundAudio.audio.play()
      return
    }

    this._backgroundAudio.audio.gain.setTargetAtTime(0, this._audioListener.context.currentTime, BACKGROUND_MUSIC_FADE_TIME / 3)
    this._backgroundAudio.audio.stop(this._audioListener.context.currentTime + BACKGROUND_MUSIC_FADE_TIME)

    this._backgroundAudio = { actionId: action.id, audio }
    this._backgroundAudio.audio.gain.value = 0
    this._backgroundAudio.audio.gain.setTargetAtTime(sourceVolume, this._audioListener.context.currentTime, BACKGROUND_MUSIC_FADE_TIME / 3)
    this._backgroundAudio.audio.play()
  }

  public pauseBackgroundMusic(): void {
    if (this._backgroundAudio != null) {
      this._backgroundAudio.audio.pause()
    }
  }

  public stopBackgroundMusic(): void {
    this._backgroundAudio?.audio.stop()
  }

  public resumeBackgroundMusic(): void {
    if (this._backgroundAudio != null) {
      this._backgroundAudio.audio.play()
    }
  }

  public lowerBackgroundMusic(): Sentinel {
    this._backgroundLowerGain.gain.value = 0.5
    const sentinel = Symbol('music') as Sentinel
    this._backgroundLowerSentinels.add(sentinel)
    return sentinel
  }

  public raiseBackgroundMusic(sentinel: Sentinel): void {
    this._backgroundLowerSentinels.delete(sentinel)
    if (this._backgroundLowerSentinels.size === 0) {
      this._backgroundLowerGain.gain.value = 1
    }
  }

  public updateVolumes(fadeMusic = true): void {
    const volumes = getSettings().volume
    for (const audioType of AudioTypes) {
      const volume = volumes[audioType]
      const gain = this._gains[audioType].gain
      if (audioType === 'music' && fadeMusic) {
        gain.setTargetAtTime(volume, this._audioListener.context.currentTime, BACKGROUND_MUSIC_FADE_TIME_SETTINGS / 3)
      } else {
        gain.value = volume
      }
    }
  }

  public get audioListener(): THREE.AudioListener {
    return this._audioListener
  }

  public get hasWorld(): boolean {
    return this._world != null
  }

  public get currentWorld(): World {
    if (this._world == null) {
      throw new Error('No world set')
    }
    return this._world
  }

  public get renderer(): THREE.WebGLRenderer {
    return this._composer.renderer
  }

  public get width(): number {
    return this._canvas.width
  }

  public get height(): number {
    return this._canvas.height
  }

  public get elapsedTimeSeconds(): number {
    return this._clock.elapsedTime
  }

  public get elapsedTimeMilliseconds(): number {
    return this.elapsedTimeSeconds * 1_000
  }

  public createTimeout(ms: number): Timeout {
    return this.createInterval(ms)
  }

  public createInterval(ms: number): Interval {
    let startTime = engine.elapsedTimeMilliseconds
    return {
      get isExpired(): boolean {
        return engine.elapsedTimeMilliseconds - startTime >= ms
      },
      get millisecondsSinceStart(): number {
        return engine.elapsedTimeMilliseconds - startTime
      },
      resetExpired(): boolean {
        if (this.isExpired) {
          startTime = engine.elapsedTimeMilliseconds
          return true
        }
        return false
      },
    }
  }

  constructor() {
    const canvas = document.getElementById('game')
    if (canvas == null) {
      throw new Error('Canvas not found')
    }
    this._canvas = canvas as HTMLCanvasElement

    this._renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      stencil: false,
      powerPreference: 'high-performance',
    })

    if (getSettings().graphics.shadows) {
      this._renderer.shadowMap.enabled = true
      this._renderer.shadowMap.type = THREE.PCFShadowMap
    }

    this._composer = new Composer(this._canvas, this._renderer)

    if (getSettings().graphics.postProcessing) {
      this._composer.addEffect(new FilmGrainEffect())
    }

    this._composer.addEffect(this._mosaicEffect)

    this._cutsceneComposer = new Composer(this._canvas, this._renderer)
    this._cutsceneComposer.add(this._cutsceneRender)

    this._cutsceneVideo = document.createElement('video')
    this._cutsceneRender.scene.add(this._cutsceneMesh)

    canvas.addEventListener('pointerdown', event => {
      event.preventDefault()
      event.stopPropagation()

      if (this._state === 'cutscene') {
        this._cutsceneVideo.pause()
        return
      }

      if (this._state === 'game') {
        this._world?.pointerDown(createNormalizedMouseEvent(event, this._canvas))
      }
    })

    canvas.addEventListener('pointerup', event => {
      event.preventDefault()
      event.stopPropagation()

      if (this._state === 'game') {
        this._world?.pointerUp(createNormalizedMouseEvent(event, this._canvas))
      }
    })

    canvas.addEventListener('pointermove', event => {
      event.preventDefault()
      event.stopPropagation()

      if (this._state === 'game') {
        this._world?.pointerMove(createNormalizedMouseEvent(event, this._canvas))
      }
    })

    document.addEventListener('keydown', event => {
      this._keyStates.add(event.key)

      if (this._state === 'game') {
        this._world?.keyDown(event)
      }
    })

    document.addEventListener('keyup', event => {
      this._keyStates.delete(event.key)

      if (this._state === 'game') {
        this._world?.keyUp(event)
      }
    })

    document.addEventListener('keypress', event => {
      event.preventDefault()
      event.stopPropagation()

      if (this._state === 'game') {
        this._world?.keyPressed(event.key)
      }
    })

    window.addEventListener('resize', this._setRendererSize)
    this._setRendererSize()

    const savesJson = localStorage.getItem(SAVE_GAME_STORAGE_KEY)
    this.saveGameNames =
      savesJson == null
        ? []
        : (() => {
            const jsonResult = JSON.parse(savesJson)
            if (Array.isArray(jsonResult) && jsonResult.every(name => typeof name === 'string' && SaveGame.validName(name))) {
              return jsonResult
            }
            return []
          })()

    const preloadedSave = getURLParam('save')
    if (preloadedSave != null) {
      this.loadSaveGame(preloadedSave.toUpperCase())
    }

    this._gains = {
      music: new GainNode(this._audioListener.context),
      effects: new GainNode(this._audioListener.context),
      speech: new GainNode(this._audioListener.context),
      animations: new GainNode(this._audioListener.context),
      cutscene: new GainNode(this._audioListener.context),
    }
    this._backgroundLowerGain = new GainNode(this._audioListener.context)

    this.updateVolumes(false)

    this.debugMode = getURLParam('debug') === 'true'
  }

  public respawnVehicle(vehicleType: VehicleType): void {
    this._respawnVehicle.add(vehicleType)
  }

  public resetVehicleRespawn(vehicleType: VehicleType): boolean {
    return this._respawnVehicle.delete(vehicleType)
  }

  public isKeyDown(key: string): boolean {
    return this._keyStates.has(key)
  }

  public start() {
    this._clock.start()
    this.renderer.setAnimationLoop(() => this._render())
  }

  public async setWorld(world: World, param?: unknown) {
    this._world?.deactivate()
    this._composer.resetPipeline()
    this._world = world
    this._world.resize(this._canvas.clientWidth, this._canvas.clientHeight)
    this._world.activate(this._composer, param)
  }

  public async transition(): Promise<void> {
    this._state = 'transition'
    this._transitionStart = this._clock.elapsedTime
    this._mosaicEffect.tileSize = Math.ceil(Math.max(this._canvas.clientWidth / ORIGINAL_TOTAL_WIDTH, this._canvas.clientHeight / ORIGINAL_TOTAL_HEIGHT) * 10)
    this._mosaicEffect.progress = 0.0
    return new Promise(resolve => {
      this._transitionPromiseResolve = resolve
    })
  }

  public getAudio(action: AudioAction, type: AudioType): Promise<Audio> {
    const gains = type === 'music' ? [this._backgroundLowerGain] : []
    gains.push(this._gains[type])
    return getAudio(this._audioListener, action, gains)
  }

  public async playAudio(action: AudioAction, type: AudioType): Promise<Audio> {
    const audio = await this.getAudio(action, type)
    audio.play()
    return audio
  }

  public async playCutscene(action: CompositeMediaAction): Promise<void> {
    this._state = 'cutscene'
    this._cutsceneAudio = await this.getAudio(action.children[1], 'cutscene')
    this._cutsceneVideo.src = getActionFileUrl(action.children[0])
    const map = new THREE.VideoTexture(this._cutsceneVideo)
    map.colorSpace = THREE.SRGBColorSpace
    this._cutsceneMesh.material = new THREE.MeshBasicMaterial({ map })
    this._cutsceneVideo.play()
    this._cutsceneAudio.play()
    return new Promise(resolve => {
      this._cutsceneVideo.onended = () => {
        this._state = 'game'
        this._cutsceneAudio?.stop()
        resolve()
      }

      this._cutsceneVideo.onpause = () => {
        this._state = 'game'
        this._cutsceneAudio?.stop()
        resolve()
      }
    })
  }

  private _setRendererSize = () => {
    let width = window.innerWidth
    let height = window.innerHeight
    const targetRatio = 4 / 3

    if (width / height > targetRatio) {
      width = height * targetRatio
    } else {
      height = width / targetRatio
    }

    this._canvas.style.left = `${(window.innerWidth - width) / 2}px`
    this._canvas.style.top = `${(window.innerHeight - height) / 2}px`

    this._renderer.setSize(width, height, false)
    this._composer.resize(width, height)
    this._world?.resize(width, height)
  }

  private _render() {
    const delta = this._clock.getDelta()

    if (this._state === 'game') {
      this._world?.updateWorld(delta)
    }

    if (this._state === 'transition') {
      const progressPerTick = 1 / 16
      const ticks = Math.floor(((this._clock.elapsedTime - this._transitionStart) * 1000) / 50)
      this._mosaicEffect.progress = progressPerTick * ticks
      if (this._mosaicEffect.progress >= 1.0) {
        this._mosaicEffect.progress = 0.0
        this._state = 'game'
        this._transitionPromiseResolve?.()
        this._transitionPromiseResolve = null
      }
    }

    if (this._state === 'cutscene') {
      this._cutsceneComposer.render(this._clock.elapsedTime)
    } else {
      this._composer.render(this._clock.elapsedTime)
    }
  }
}

export const engine = new Engine()
