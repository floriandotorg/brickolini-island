import * as THREE from 'three'
import type { AudioAction, CompositeMediaAction } from './action-types'
import { getAudio } from './assets/audio'
import { getActionFileUrl } from './assets/load'
import { Composer, Render2D } from './effect/composer'
import { MosaicEffect } from './effect/mosaic'
import { getSettings } from './settings'
import type { World } from './world/world'

export const RESOLUTION_RATIO = 4 / 3
const BACKGROUND_MUSIC_FADE_TIME = 2
const BACKGROUND_MUSIC_FADE_TIME_SETTINGS = 0.5

class Engine {
  private _state: 'cutscene' | 'transition' | 'game' = 'game'
  private _clock: THREE.Clock = new THREE.Clock()
  private _cutsceneVideo: HTMLVideoElement
  private _cutsceneAudio: THREE.Audio | null = null
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
  private _backgroundAudio: { actionId: number; audio: THREE.Audio; sourceVolume: number } | null = null
  private _transitionStart: number = 0
  private _transitionPromiseResolve: (() => void) | null = null

  public currentPlayerCharacter: 'pepper' | 'papa' | 'mama' | 'nick' | 'laura' = 'pepper'

  public async switchBackgroundMusic(action: AudioAction): Promise<void> {
    if (this._backgroundAudio?.actionId === action.id) {
      return
    }

    const audio = await getAudio(this._audioListener, action)
    audio.loop = true
    const sourceVolume = action.volume / 100
    const targetVolume = sourceVolume * getSettings().musicVolume

    if (this._backgroundAudio == null) {
      this._backgroundAudio = { actionId: action.id, audio, sourceVolume }
      this._backgroundAudio.audio.gain.gain.value = targetVolume
      this._backgroundAudio.audio.play()
      return
    }

    this._backgroundAudio.audio.gain.gain.setTargetAtTime(0, audio.context.currentTime, BACKGROUND_MUSIC_FADE_TIME / 3)
    this._backgroundAudio.audio.stop(audio.context.currentTime + BACKGROUND_MUSIC_FADE_TIME)

    this._backgroundAudio = { actionId: action.id, audio, sourceVolume }
    this._backgroundAudio.audio.gain.gain.value = 0
    this._backgroundAudio.audio.gain.gain.setTargetAtTime(targetVolume, audio.context.currentTime, BACKGROUND_MUSIC_FADE_TIME / 3)
    this._backgroundAudio.audio.play()
  }

  public updateBackgroundVolume() {
    if (this._backgroundAudio != null) {
      const targetVolume = this._backgroundAudio.sourceVolume * getSettings().musicVolume
      this._backgroundAudio.audio.gain.gain.setTargetAtTime(targetVolume, this._backgroundAudio.audio.context.currentTime, BACKGROUND_MUSIC_FADE_TIME_SETTINGS / 3)
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

  public get clock(): THREE.Clock {
    return this._clock
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
    this._renderer.setPixelRatio(window.devicePixelRatio)

    if (getSettings().graphics.shadows) {
      this._renderer.shadowMap.enabled = true
      this._renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }

    this._composer = new Composer(this._canvas, this._renderer)
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
        const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1
        const normalizedY = -((event.clientY - rect.top) / rect.height) * 2 + 1

        this._world?.click(event, normalizedX, normalizedY)
      }
    })

    canvas.addEventListener('pointerdown', event => {
      event.preventDefault()
      event.stopPropagation()

      if (this._state === 'game') {
        const rect = canvas.getBoundingClientRect()
        const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1
        const normalizedY = -((event.clientY - rect.top) / rect.height) * 2 + 1

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

    document.addEventListener('keydown', event => {
      this._keyStates.add(event.key)
    })

    document.addEventListener('keyup', event => {
      this._keyStates.delete(event.key)
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
  }

  public isKeyDown(key: string): boolean {
    return this._keyStates.has(key)
  }

  public start() {
    this._clock.start()
    this._render()
  }

  public async setWorld(world: World, param?: unknown) {
    this._world?.deactivate()
    this._composer.resetPipeline()
    this._world = world
    this._world.resize(this._canvas.width, this._canvas.height)
    this._world.activate(this._composer, param)
  }

  public async transition(): Promise<void> {
    this._state = 'transition'
    this._transitionStart = this._clock.elapsedTime
    this._mosaicEffect.tileSize = Math.ceil(Math.max(this._canvas.width / 640, this._canvas.height / 480) * 10)
    this._mosaicEffect.progress = 0.0
    return new Promise(resolve => {
      this._transitionPromiseResolve = resolve
    })
  }

  public async playAudio(action: AudioAction): Promise<void> {
    const audio = await getAudio(this._audioListener, action)
    audio.play()
  }

  public async playCutscene(action: CompositeMediaAction): Promise<void> {
    this._state = 'cutscene'
    this._cutsceneAudio = await getAudio(this._audioListener, action.children[1])
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
    let width = Math.floor(window.innerHeight * RESOLUTION_RATIO)
    let height = window.innerHeight
    if (width > window.innerWidth) {
      width = window.innerWidth
      height = Math.floor(window.innerWidth / RESOLUTION_RATIO)
    }
    this._composer.resize(width, height)
    this._world?.resize(width, height)
  }

  private _render() {
    requestAnimationFrame(() => this._render())

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
      this._cutsceneComposer.render()
    } else {
      this._composer.render()
    }
  }
}

export const engine = new Engine()
