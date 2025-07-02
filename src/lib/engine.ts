import * as THREE from 'three'
import type { Action } from '../actions/types'
import { getActionFileUrl, getAudio, getPositionalAudio } from './assets'
import { getSettings } from './settings'
import postFrag from './shader/post-frag.glsl'
import postVert from './shader/post-vert.glsl'
import type { World } from './world/world'

export const RESOLUTION_RATIO = 4 / 3
const BACKGROUND_MUSIC_FADE_TIME = 2

class Engine {
  private _canvas: HTMLCanvasElement
  private _state: 'cutscene' | 'transition' | 'game' = 'game'
  private _clock: THREE.Clock = new THREE.Clock()
  private _cutsceneVideo: HTMLVideoElement
  private _cutsceneAudio: THREE.Audio | null = null
  private _renderer: THREE.WebGLRenderer
  private _renderTarget: THREE.WebGLRenderTarget
  private _postScene = new THREE.Scene()
  private _audioListener = new THREE.AudioListener()
  private _postCamera: THREE.OrthographicCamera
  private _postMaterial: THREE.ShaderMaterial
  private _cutsceneScene = new THREE.Scene()
  private _cutsceneCamera: THREE.OrthographicCamera
  private _cutsceneMesh: THREE.Mesh
  private _world: World | null = null
  private _keyStates: Set<string> = new Set()
  private _backgroundAudio: THREE.Audio | null = null
  private _transitionStart: number = 0
  private _transitionPromiseResolve: (() => void) | null = null

  public async switchBackgroundMusic(action: { id: number; siFile: string; fileType: Action.FileType.WAV; volume: number }): Promise<void> {
    const audio = await getAudio(this._audioListener, action)
    audio.loop = true

    if (this._backgroundAudio == null) {
      this._backgroundAudio = audio
      this._backgroundAudio.play()
      return
    }

    this._backgroundAudio.gain.gain.setTargetAtTime(0, audio.context.currentTime, BACKGROUND_MUSIC_FADE_TIME / 3)
    this._backgroundAudio.stop(audio.context.currentTime + BACKGROUND_MUSIC_FADE_TIME)

    this._backgroundAudio = audio
    this._backgroundAudio.gain.gain.value = 0
    this._backgroundAudio.gain.gain.setTargetAtTime(1, audio.context.currentTime, BACKGROUND_MUSIC_FADE_TIME / 3)
    this._backgroundAudio.play()
  }

  public get audioListener(): THREE.AudioListener {
    return this._audioListener
  }

  public get currentWorld(): World {
    if (this._world == null) {
      throw new Error('No world set')
    }
    return this._world
  }

  public get renderer(): THREE.WebGLRenderer {
    return this._renderer
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
    this._cutsceneVideo = document.createElement('video')

    const canvas = document.getElementById('game')
    if (canvas == null) {
      throw new Error('Canvas not found')
    }
    this._canvas = canvas as HTMLCanvasElement

    this._renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this._renderer.autoClear = false
    this._renderer.setPixelRatio(window.devicePixelRatio)

    const settings = getSettings()
    if (settings.graphics.toneMapping === 'none') {
      this._renderer.toneMapping = THREE.NoToneMapping
    } else {
      this._renderer.toneMapping = THREE.ACESFilmicToneMapping
      this._renderer.toneMappingExposure = 0.5
    }

    if (settings.graphics.shadows) {
      this._renderer.shadowMap.enabled = true
      this._renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }

    this._cutsceneMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2))
    this._cutsceneCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10)
    this._cutsceneScene.add(this._cutsceneMesh)

    this._renderTarget = new THREE.WebGLRenderTarget(1, 1, {
      samples: 4,
      type: THREE.FloatType,
    })
    this._postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this._postCamera.add(this._audioListener)
    this._postMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this._renderTarget.texture },
        uMosaicProgress: { value: 0.0 },
        uTileSize: { value: 1.0 },
        uVibrance: { value: settings.graphics.postProcessing ? 0.3 : 0.0 },
        uSaturation: { value: settings.graphics.postProcessing ? 1.1 : 1.0 },
        uContrast: { value: settings.graphics.postProcessing ? 1.0 : 1.0 },
        uBrightness: { value: settings.graphics.postProcessing ? 1.1 : 1.0 },
      },
      vertexShader: postVert,
      fragmentShader: postFrag,
    })
    this._postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._postMaterial))

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

  public async setWorld(world: World) {
    this._world = world
    this._world.resize(this._canvas.width, this._canvas.height)
    await this._world.init()
  }

  public async transition(): Promise<void> {
    this._state = 'transition'
    this._transitionStart = this._clock.elapsedTime
    this._postMaterial.uniforms.uTileSize.value = Math.ceil(Math.max(this._canvas.width / 640, this._canvas.height / 480) * 10)
    this._postMaterial.uniforms.uMosaicProgress.value = 0.0
    return new Promise(resolve => {
      this._transitionPromiseResolve = resolve
    })
  }

  public async playAudio(action: { id: number; siFile: string; fileType: Action.FileType.WAV; volume: number }): Promise<void> {
    const audio = await getAudio(this._audioListener, action)
    audio.play()
  }

  public async playCutscene(action: { presenter: 'MxCompositeMediaPresenter'; children: readonly [{ id: number; siFile: string; fileType: Action.FileType.SMK }, { id: number; siFile: string; fileType: Action.FileType.WAV; volume: number }] }): Promise<void> {
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
    this._renderTarget.setSize(width, height)
    this._renderer.setSize(width, height)
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
      this._postMaterial.uniforms.uMosaicProgress.value = progressPerTick * ticks
      if (this._postMaterial.uniforms.uMosaicProgress.value >= 1.0) {
        this._postMaterial.uniforms.uMosaicProgress.value = 0.0
        this._state = 'game'
        this._transitionPromiseResolve?.()
        this._transitionPromiseResolve = null
      }
    }

    this._renderer.setRenderTarget(this._renderTarget)
    this._renderer.clear()

    if (this._state === 'cutscene') {
      this._renderer.render(this._cutsceneScene, this._cutsceneCamera)
    } else {
      this._world?.render(this._renderer)
    }

    this._renderer.setRenderTarget(null)
    this._renderer.clear()
    this._renderer.render(this._postScene, this._postCamera)
  }
}

export const engine = new Engine()
