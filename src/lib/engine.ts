import * as THREE from 'three'
import type { AudioAction, CompositeMediaAction } from './action-types'
import { type Audio, getAudio } from './assets/audio'
import { getActionFileUrl } from './assets/load'
import { Composer, Render2D } from './effect/composer'
import { FilmGrainEffect } from './effect/film-grain'
import { MosaicEffect } from './effect/mosaic'
import { getSettings } from './settings'
import type { World } from './world/world'

export const RESOLUTION_RATIO = 4 / 3
const BACKGROUND_MUSIC_FADE_TIME = 2
const BACKGROUND_MUSIC_FADE_TIME_SETTINGS = 0.5

export const ORIGINAL_TOTAL_WIDTH: number = 640
export const ORIGINAL_TOTAL_HEIGHT: number = 480

export const normalizePoint = (x: number, y: number, totalSize: [number, number] = [ORIGINAL_TOTAL_WIDTH, ORIGINAL_TOTAL_HEIGHT]): [number, number] => {
  const normalizedX = (x / totalSize[0]) * 2 - 1
  const normalizedY = -((y / totalSize[1]) * 2 - 1)
  return [normalizedX, normalizedY]
}

export const normalizeRect = (x: number, y: number, w: number, h: number, totalSize: [number, number] = [ORIGINAL_TOTAL_WIDTH, ORIGINAL_TOTAL_HEIGHT]): [number, number, number, number] => {
  const [normalizedX, normalizedY] = normalizePoint(x, y, totalSize)
  const normalizedWidth = (w / totalSize[0]) * 2
  const normalizedHeight = (h / totalSize[1]) * 2
  return [normalizedX, normalizedY, normalizedWidth, normalizedHeight]
}

const SAVE_GAME_STORAGE_KEY = 'saves'
type SaveGame = { readonly name: string }

export type PlayerCharacter = 'pepper' | 'papa' | 'mama' | 'nick' | 'laura'

// Keep both entries "in sync"!
export type AudioType = 'music' | 'effects' | 'speech' | 'animations' | 'cutscene'
export const AudioTypes: AudioType[] = ['music', 'effects', 'speech', 'animations', 'cutscene']

export type Timeout = {
  get isExpired(): boolean
  get millisecondsSinceStart(): number
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
  private _transitionStart: number = 0
  private _transitionPromiseResolve: (() => void) | null = null
  private _currentSaveGame: SaveGame = { name: '' }
  private _saveGames: SaveGame[]
  private readonly _gains: Record<AudioType, GainNode>

  public currentPlayerCharacter: PlayerCharacter | null = new URLSearchParams(window.location.search).get('player') as PlayerCharacter | null

  public get currentPlayerCharacterSafe(): PlayerCharacter {
    if (this.currentPlayerCharacter == null) {
      throw new Error('Current player character is null')
    }
    return this.currentPlayerCharacter
  }

  public get currentPlayerMask(): number {
    if (this.currentPlayerCharacter == null) {
      return 0
    }

    return 1 << (this.currentPlayerId - 1)
  }

  public get currentPlayerId(): number {
    switch (this.currentPlayerCharacter) {
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

    throw new Error('Invalid player character')
  }

  public get hasBuiltHelicopter(): boolean {
    return false
  }

  public get saveGameNames(): string[] {
    return this._saveGames.map(save => save.name)
  }

  public get currentSaveGame(): SaveGame {
    return this._currentSaveGame
  }

  private set currentSaveGame(saveGame: SaveGame) {
    this._saveGames.splice(0, 0, saveGame)
    this._currentSaveGame = saveGame
  }

  public loadSaveGame(name: string): void {
    for (const [index, saveGame] of this._saveGames.entries()) {
      if (saveGame.name.toUpperCase() === name.toUpperCase()) {
        this._saveGames.splice(index, 1)
        this.currentSaveGame = saveGame
        return
      }
    }
    this.currentSaveGame = { name }
  }

  public storeSaveGames(): void {
    localStorage.setItem(SAVE_GAME_STORAGE_KEY, JSON.stringify(this._saveGames))
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

  public resumeBackgroundMusic(): void {
    if (this._backgroundAudio != null) {
      this._backgroundAudio.audio.play()
    }
  }

  public updateVolumes(fadeMusic: boolean = true): void {
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
    const startTime = this.elapsedTimeMilliseconds
    return {
      get isExpired(): boolean {
        return engine.elapsedTimeMilliseconds - startTime >= ms
      },
      get millisecondsSinceStart(): number {
        return engine.elapsedTimeMilliseconds - startTime
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
      this._renderer.shadowMap.type = THREE.PCFSoftShadowMap
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

    canvas.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()

      if (this._state === 'cutscene') {
        this._cutsceneVideo.pause()
        return
      }

      if (this._state === 'game') {
        const rect = canvas.getBoundingClientRect()
        const [normalizedX, normalizedY] = normalizePoint(event.clientX - rect.left, event.clientY - rect.top, [rect.width, rect.height])

        this._world?.click(event, normalizedX, normalizedY)
      }
    })

    canvas.addEventListener('pointerdown', event => {
      event.preventDefault()
      event.stopPropagation()

      if (this._state === 'game') {
        const rect = canvas.getBoundingClientRect()
        const [normalizedX, normalizedY] = normalizePoint(event.clientX - rect.left, event.clientY - rect.top, [rect.width, rect.height])

        this._world?.pointerDown(event, normalizedX, normalizedY)
      }
    })

    canvas.addEventListener('pointerup', event => {
      event.preventDefault()
      event.stopPropagation()

      if (this._state === 'game') {
        this._world?.pointerUp(event)
      }
    })

    canvas.addEventListener('pointermove', event => {
      event.preventDefault()
      event.stopPropagation()

      if (this._state === 'game') {
        const rect = canvas.getBoundingClientRect()
        const [normalizedX, normalizedY] = normalizePoint(event.clientX - rect.left, event.clientY - rect.top, [rect.width, rect.height])

        this._world?.pointerMove(event, normalizedX, normalizedY)
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
    this._saveGames = savesJson == null ? [] : JSON.parse(savesJson)

    this._gains = {
      music: new GainNode(this._audioListener.context),
      effects: new GainNode(this._audioListener.context),
      speech: new GainNode(this._audioListener.context),
      animations: new GainNode(this._audioListener.context),
      cutscene: new GainNode(this._audioListener.context),
    }

    this.updateVolumes(false)
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
    return getAudio(this._audioListener, action, this._gains[type])
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
      this._world?.update(delta)
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
