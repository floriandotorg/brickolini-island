import * as THREE from 'three'
import type { AudioAction, CompositeMediaAction, ImageAction, PositionalAudioAction } from './action-types'
import { type Audio, getAudio, getPositionalAudio, type SpatialAudio } from './assets/audio'
import { getActionFileUrl } from './assets/load'
import { BackgroundMusic } from './audio/music.ts'
import { SoundCache } from './audio/sound-cache.ts'
import { setCursor } from './cursor.ts'
import { updateDebugFps } from './debug-keys.ts'
import { Composer, Render2D } from './effect/composer'
import { FilmGrainEffect } from './effect/film-grain'
import { MosaicEffect } from './effect/mosaic'
import { handleGlobalKey } from './global-keys.ts'
import { InputManager } from './input.ts'
import { PlayerDirectory } from './player-directory.ts'
import { SaveGame } from './save-game'
import { getScoreHistory } from './score-history.ts'
import { resetSession } from './session-state.ts'
import { getSettings } from './settings'
import { Transition, type TransitionOptions } from './transition.ts'
import type { VehicleType } from './world/dashboard'
import type { World } from './world/world'

export const RESOLUTION_RATIO = 4 / 3
const BACKGROUND_MUSIC_FADE_TIME_SETTINGS = 0.5

export const ORIGINAL_TOTAL_WIDTH: number = 640
export const ORIGINAL_TOTAL_HEIGHT: number = 480

export const getURLParam = (name: string): string | null => new URLSearchParams(window.location.search).get(name)

export const normalizePoint = (x: number, y: number, totalSize: [number, number] = [ORIGINAL_TOTAL_WIDTH, ORIGINAL_TOTAL_HEIGHT]): [number, number] => {
  const normalizedX = (x / totalSize[0]) * 2 - 1
  const normalizedY = -((y / totalSize[1]) * 2 - 1)
  return [normalizedX, normalizedY]
}

export type LetterboxAnchor = 'center' | 'bottom'

export type LetterboxBounds = { left: number; right: number; top: number; bottom: number }

export const letterboxBounds = (width: number, height: number, contentAspect: number = RESOLUTION_RATIO, anchor: LetterboxAnchor = 'center'): LetterboxBounds => {
  const canvasAspect = width / height
  if (canvasAspect > contentAspect) {
    const half = canvasAspect / contentAspect
    return { left: -half, right: half, top: 1, bottom: -1 }
  }
  const half = contentAspect / canvasAspect
  if (anchor === 'bottom') {
    return { left: -1, right: 1, top: half, bottom: -1 }
  }
  return { left: -1, right: 1, top: half, bottom: -half }
}

export const screenToContentNDC = (nx: number, ny: number, width: number, height: number, contentAspect: number = RESOLUTION_RATIO, anchor: LetterboxAnchor = 'center'): [number, number] => {
  const { left, right, top, bottom } = letterboxBounds(width, height, contentAspect, anchor)
  const contentX = ((nx + 1) / 2) * (right - left) + left
  const contentY = ((ny + 1) / 2) * (top - bottom) + bottom
  return [contentX, contentY]
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z))
}

export const normalizeZ = (z: number | ImageAction): number => {
  const center = -0.5
  const spread = 1 / 2
  const actualZ = typeof z === 'number' ? z : z.location[2]
  return center - (sigmoid(actualZ) - 0.5) * spread
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

export type Sentinel = symbol

export type NormalizedMouseEvent = {
  normalizedX: number
  normalizedY: number
  ndcX: number
  ndcY: number
}

const createNormalizedMouseEvent = (event: MouseEvent, canvas: HTMLCanvasElement): NormalizedMouseEvent => {
  const rect = canvas.getBoundingClientRect()
  const [ndcX, ndcY] = normalizePoint(event.clientX - rect.left, event.clientY - rect.top, [rect.width, rect.height])
  const [normalizedX, normalizedY] = screenToContentNDC(ndcX, ndcY, rect.width, rect.height)

  return { normalizedX, normalizedY, ndcX, ndcY }
}

class Engine {
  private _state: 'cutscene' | 'transition' | 'game' = 'game'
  private _timer = new THREE.Timer()
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
  public readonly input = new InputManager()
  public readonly music = new BackgroundMusic<AudioAction>(action => this.getAudio(action, 'music'))
  private readonly _pauseReasons = new Set<string>()
  private _elapsed = 0
  private _skipDelta = false
  private readonly _videos = new Set<HTMLVideoElement>()
  private readonly _pausedVideos = new Set<HTMLVideoElement>()
  private readonly _musicVideos = new Map<HTMLVideoElement, () => void>()
  private _transition: Transition | null = null
  private readonly _backgroundMusicChangedListeners = new Set<(actionId: number | null) => void>()
  private _transitionStart = 0
  private _transitionPromise: Promise<void> | null = null
  private _transitionPromiseResolve: (() => void) | null = null
  private _currentSaveGame = SaveGame.UnloadedSave
  private readonly _gains: Record<AudioType, GainNode>
  private readonly _backgroundLowerSentinels = new Set<Sentinel>()
  private readonly _respawnVehicle = new Set<VehicleType>()

  private readonly _positionalSounds = new Set<SpatialAudio>()
  private readonly _cameraPosition = new THREE.Vector3()
  public debugMode = false
  public readonly playerDirectory: PlayerDirectory

  public get saveGameNames(): readonly string[] {
    return this.playerDirectory.names
  }

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

  public get currentSaveGame(): SaveGame {
    return this._currentSaveGame
  }

  public loadSaveGame(name: string): void {
    const save = SaveGame.create(name)
    getScoreHistory().update(this._currentSaveGame)
    const index = this.playerDirectory.find(name)
    if (index >= 0) {
      this.playerDirectory.select(index)
    } else {
      this.playerDirectory.add(name)
      save.act = 1
    }
    save.ensurePlayerId()
    this._currentSaveGame = save
    getScoreHistory().update(save)
    resetSession()
    this._respawnVehicle.clear()
  }

  public storeSaveGames(): void {
    if (!this.currentSaveGame.isUnloaded) {
      getScoreHistory().update(this.currentSaveGame)
    }
    this.playerDirectory.store()
    this.currentSaveGame.dirty = false
  }

  public switchBackgroundMusic(action: AudioAction, speed = 5, options: { loop?: boolean; onEnded?: () => void } = {}): Promise<void> {
    return this.music.play(action, speed, options)
  }

  public onBackgroundMusicChanged(listener: (actionId: number | null) => void): () => void {
    this._backgroundMusicChangedListeners.add(listener)
    return () => {
      this._backgroundMusicChangedListeners.delete(listener)
    }
  }

  private _notifyBackgroundMusicChanged(actionId: number | null): void {
    for (const listener of this._backgroundMusicChangedListeners) {
      listener(actionId)
    }
  }

  public pauseBackgroundMusic(): void {
    this.music.pause()
  }

  public stopBackgroundMusic(): void {
    this.music.stop()
    this._backgroundLowerSentinels.clear()
  }

  public resumeBackgroundMusic(): void {
    this.music.resume()
  }

  public lowerBackgroundMusic(): Sentinel {
    this.music.lower()
    const sentinel = Symbol('music')
    this._backgroundLowerSentinels.add(sentinel)
    return sentinel
  }

  public raiseBackgroundMusic(sentinel: Sentinel): void {
    if (this._backgroundLowerSentinels.delete(sentinel)) {
      this.music.raise()
    }
  }

  public get paused(): boolean {
    return this._pauseReasons.size > 0
  }

  public setPaused(paused: boolean, reason = 'manual'): void {
    const wasPaused = this.paused
    if (paused) {
      this._pauseReasons.add(reason)
    } else {
      this._pauseReasons.delete(reason)
    }
    if (wasPaused === this.paused) {
      return
    }
    this.input.clear()
    this._skipDelta = true
    if (this.paused) {
      void this._audioListener.context.suspend()
      for (const video of this._videos) {
        if (!video.paused) {
          this._pausedVideos.add(video)
          video.pause()
        }
      }
      if (this._state === 'cutscene') {
        this._cutsceneVideo.pause()
      }
    } else {
      void this._audioListener.context.resume()
      for (const video of this._pausedVideos) {
        void video.play()
      }
      this._pausedVideos.clear()
      if (this._state === 'cutscene') {
        void this._cutsceneVideo.play()
      }
    }
    this._restoreCursor()
  }

  private _restoreCursor(): void {
    setCursor(this._pauseReasons.has('manual') ? 'no' : this._state === 'cutscene' || this.input.buttonDownActsAsSpace ? 'none' : this._state === 'transition' ? 'busy' : 'arrow')
  }

  public registerVideo(video: HTMLVideoElement, musicOnly = false, stop?: () => void): void {
    this._videos.add(video)
    if (musicOnly && stop != null) {
      this._musicVideos.set(video, stop)
    }
  }

  public playVideo(video: HTMLVideoElement): void {
    if (this.paused) {
      this._pausedVideos.add(video)
    } else {
      void video.play()
    }
  }

  public unregisterVideo(video: HTMLVideoElement): void {
    this._videos.delete(video)
    this._pausedVideos.delete(video)
    this._musicVideos.delete(video)
  }

  public updateVolumes(fadeMusic = true): void {
    this.music.setEnabled(getSettings().music)
    if (!this.music.enabled) {
      this._backgroundLowerSentinels.clear()
      for (const stop of this._musicVideos.values()) {
        stop()
      }
    }
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
    return this._elapsed
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
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('Canvas not found')
    }
    this._canvas = canvas

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
    this._cutsceneMesh.position.z = -1
    this._cutsceneRender.scene.add(this._cutsceneMesh)

    this.input.onGesture = (kind, point) => {
      const normalizedX = point.x / 320 - 1
      const normalizedY = 1 - point.y / 240
      this._world?.gesture(kind, { normalizedX, normalizedY, ndcX: normalizedX, ndcY: normalizedY })
    }
    const point = (event: PointerEvent) => {
      const normalized = createNormalizedMouseEvent(event, this._canvas)
      return { x: (normalized.normalizedX + 1) * 320, y: (1 - normalized.normalizedY) * 240 }
    }
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 || this.paused) {
        return
      }
      event.preventDefault()
      if (this.input.buttonDownActsAsSpace) {
        if (this._state === 'cutscene') {
          this.skipCutscene()
        } else {
          this._world?.keyPressed('Space', ' ')
        }
        return
      }
      if (this.input.inputDisabled || this._state !== 'game') {
        return
      }
      canvas.setPointerCapture(event.pointerId)
      if (this.input.pointerDown(point(event), this.elapsedTimeMilliseconds)) {
        this._world?.beginPointer()
        void this._world?.pointerDown(createNormalizedMouseEvent(event, canvas))
      }
    })
    canvas.addEventListener('pointerup', event => {
      if (event.button !== 0 || this.paused || this.input.inputDisabled || this.input.buttonDownActsAsSpace || this._state !== 'game') {
        return
      }
      this._world?.pointerUp(createNormalizedMouseEvent(event, canvas))
      this.input.pointerUp()
    })
    canvas.addEventListener('pointermove', event => {
      if (!this.paused && !this.input.inputDisabled && !this.input.buttonDownActsAsSpace && this._state === 'game') {
        this._world?.pointerMove(createNormalizedMouseEvent(event, canvas))
        this.input.pointerMove(point(event))
      }
    })
    canvas.addEventListener('pointercancel', () => this.input.clear())
    document.addEventListener('keydown', event => {
      if (document.querySelector('dialog[open]') != null || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) {
        return
      }
      if (this.paused) {
        if (event.code === 'Pause' && !event.repeat) {
          this.setPaused(false)
        }
        return
      }
      if (!this.input.acceptsKey(event.code) && !(this.input.buttonDownActsAsSpace && (event.code === 'Escape' || event.code === 'Pause'))) {
        return
      }
      this.input.keyDown(event.code)
      if (event.code !== 'F2') {
        event.preventDefault()
      }
      if (event.repeat) {
        return
      }
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        this.input.toggleSticky()
        return
      }
      if (event.code === 'Pause') {
        handleGlobalKey(event.code)
        return
      }
      if (this._state === 'cutscene') {
        if (event.code === 'Space' || event.code === 'Escape') {
          this.skipCutscene()
        }
        return
      }
      if (handleGlobalKey(event.code)) {
        return
      }
      if (this._state === 'game') {
        this._world?.keyDown(event)
        this._world?.keyPressed(event.code, event.key)
      }
    })
    document.addEventListener('keyup', event => {
      this.input.keyUp(event.code)
      if (!this.paused && this._state === 'game') {
        this._world?.keyUp(event)
      }
    })
    document.addEventListener('visibilitychange', () => this.setPaused(document.hidden, 'hidden'))
    window.addEventListener('blur', () => {
      this.input.clear()
      if (getSettings().pauseOnBlur) {
        this.setPaused(true, 'blur')
      }
    })
    window.addEventListener('focus', () => this.setPaused(false, 'blur'))
    window.addEventListener('pagehide', () => {
      if (!this.currentSaveGame.isUnloaded) {
        this.storeSaveGames()
      }
    })

    window.addEventListener('resize', this._setRendererSize)
    this._setRendererSize()

    this.playerDirectory = new PlayerDirectory(localStorage, SaveGame.delete)

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
    this.music.onChanged = id => {
      if (!this.music.enabled) {
        this._backgroundLowerSentinels.clear()
        for (const stop of this._musicVideos.values()) {
          stop()
        }
      }
      this._notifyBackgroundMusicChanged(id)
    }

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
    const flags = this.input.getNavigationFlags()
    const aliases: Record<string, boolean> = { ArrowUp: flags.up, ArrowDown: flags.down, ArrowLeft: flags.left, ArrowRight: flags.right }
    return aliases[key] ?? this.input.keys.has(key.length === 1 ? `Key${key.toUpperCase()}` : key)
  }

  public start() {
    this._timer.connect(document)
    this._timer.reset()
    this.renderer.setAnimationLoop(() => this._render())
  }

  public async setWorld(world: World, param?: unknown) {
    this._world?.soundCache.deactivate()
    for (const audio of this._positionalSounds) {
      if (audio.isPlaying) {
        audio.stop()
      }
      audio.removeFromParent()
      audio.gain.disconnect()
    }
    this._positionalSounds.clear()
    this._world?.deactivate()
    if (this._world != null) {
      this._world.camera.remove(this._audioListener)
    }
    this._composer.resetPipeline()
    this._world = world
    this._setRendererSize()
    this.finishTransition()
    await this._world.activate(this._composer, param)
    this._world.camera.add(this._audioListener)
  }

  public transition(options: TransitionOptions | number = {}): Promise<void> {
    if (this._transitionPromise != null) {
      return this._transitionPromise
    }
    const settings = typeof options === 'number' ? { speedMs: options } : options
    if (!settings.keepMusic) {
      this.stopBackgroundMusic()
    }
    this._state = 'transition'
    this.input.buttonDownActsAsSpace = false
    this.input.disable()
    this._restoreCursor()
    this._transitionStart = this.elapsedTimeMilliseconds
    this._transition = new Transition(settings)
    this._mosaicEffect.configure(this._transition)
    this._transitionPromise = new Promise(resolve => {
      this._transitionPromiseResolve = resolve
    })
    return this._transitionPromise
  }

  public finishTransition(): void {
    this._transitionPromise = null
    this._transition = null
    this._mosaicEffect.ticks = 0
    this._state = 'game'
    this.input.buttonDownActsAsSpace = false
    this.input.enable()
    this._restoreCursor()
  }

  public getAudio(action: AudioAction, type: AudioType): Promise<Audio> {
    return getAudio(this._audioListener, action, [this._gains[type]])
  }

  public skipCutscene(): void {
    this._cutsceneVideo.pause()
    this._endCutscene?.('skipped')
  }

  private _endCutscene: ((result: 'ended' | 'skipped') => void) | null = null

  public createSoundCache(): SoundCache {
    return new SoundCache(this._audioListener, this._gains.effects)
  }

  public async getPositionalAudio(action: PositionalAudioAction, type: AudioType): Promise<SpatialAudio> {
    const audio = await getPositionalAudio(this._audioListener, action, [this._gains[type]])
    this._positionalSounds.add(audio)
    return audio
  }

  public async playAudio(action: AudioAction, type: AudioType): Promise<Audio> {
    const audio = await this.getAudio(action, type)
    audio.play()
    return audio
  }

  public async playCutscene(action: CompositeMediaAction): Promise<'ended' | 'skipped'> {
    this._state = 'cutscene'
    this.input.disable()
    this.input.allowSpaceWhileDisabled = true
    this.input.buttonDownActsAsSpace = true
    this._restoreCursor()

    const savedGains: Partial<Record<AudioType, number>> = {}
    for (const type of AudioTypes) {
      if (type === 'cutscene') continue
      savedGains[type] = this._gains[type].gain.value
      this._gains[type].gain.value = 0
    }
    const restoreAudio = () => {
      for (const type of AudioTypes) {
        if (type === 'cutscene') continue
        this._gains[type].gain.value = savedGains[type] ?? 1
      }
    }

    this._cutsceneAudio = await this.getAudio(action.children[1], 'cutscene')
    this._cutsceneVideo.src = getActionFileUrl(action.children[0])
    const map = new THREE.VideoTexture(this._cutsceneVideo)
    map.colorSpace = THREE.SRGBColorSpace
    this._cutsceneMesh.material = new THREE.MeshBasicMaterial({ map })
    this.playVideo(this._cutsceneVideo)
    this._cutsceneAudio.play()
    return new Promise(resolve => {
      const end = (result: 'ended' | 'skipped') => {
        this._cutsceneVideo.pause()
        this._state = 'game'
        this.input.buttonDownActsAsSpace = false
        this.input.enable()
        this._restoreCursor()
        this._endCutscene = null
        this._cutsceneAudio?.stop()
        restoreAudio()
        resolve(result)
      }

      this._endCutscene = end
      this._cutsceneVideo.onended = () => end('ended')
    })
  }

  public resize = () => {
    this._setRendererSize()
  }

  private _setRendererSize = () => {
    let width = window.innerWidth
    let height = window.innerHeight
    const fill = getSettings().fill && !(this._world?.fixedAspectRatio ?? false)

    if (!fill) {
      const targetRatio = RESOLUTION_RATIO
      if (width / height > targetRatio) {
        width = height * targetRatio
      } else {
        height = width / targetRatio
      }
    }

    this._canvas.style.left = `${(window.innerWidth - width) / 2}px`
    this._canvas.style.top = `${(window.innerHeight - height) / 2}px`

    this._renderer.setSize(width, height, false)
    this._composer.resize(width, height)
    this._cutsceneComposer.resize(width, height)
    this._world?.resize(width, height)
  }

  private _render() {
    this._timer.update()
    const delta = this._skipDelta || this.paused ? 0 : this._timer.getDelta()
    this._skipDelta = false
    if (this.paused) {
      return
    }
    this._elapsed += delta
    updateDebugFps(delta)
    this.music.update(delta)
    this.input.update(this.elapsedTimeMilliseconds)
    if (this._state === 'game') {
      this._world?.updateWorld(delta)
      if (this._world != null) {
        this._world.camera.getWorldPosition(this._cameraPosition)
        const sound3d = getSettings().sound3d
        this._world.soundCache.update(this._cameraPosition, sound3d)
        for (const audio of this._positionalSounds) {
          if (audio.parent == null && !audio.isPlaying) {
            this._positionalSounds.delete(audio)
          } else {
            audio.updateSpatial(this._cameraPosition, sound3d)
          }
        }
      }
    }
    if (this._state === 'transition' && this._transition != null) {
      const finished = this._transition.update(this.elapsedTimeMilliseconds - this._transitionStart)
      this._mosaicEffect.ticks = this._transition.ticks
      if (finished && this._transitionPromiseResolve != null) {
        const resolve = this._transitionPromiseResolve
        this._transitionPromiseResolve = null
        resolve()
      }
    }
    if (this._state === 'cutscene') {
      this._cutsceneComposer.render(this._elapsed)
    } else {
      this._composer.render(this._state === 'transition' ? this._transitionStart / 1000 : this._elapsed, this._state === 'transition')
    }
  }
}

export const engine = new Engine()
