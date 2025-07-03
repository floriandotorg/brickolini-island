import * as THREE from 'three'
import { Action } from '../../actions/types'
import type { AudioAction } from '../assets'
import { getImage } from '../assets/image'
import { engine } from '../engine'

type Child = { id: number; type: Action.Type; siFile: string; fileType?: Action.FileType; children: readonly Child[]; name: string; presenter: string | null; location: readonly [number, number, number]; volume?: number }

class Mask {
  private _context: CanvasRenderingContext2D

  constructor(image: CanvasImageSource, x: number, y: number) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (context == null) {
      throw new Error('Unable to create canvas context')
    }
    this._context = context
    canvas.width = 640
    canvas.height = 480
    context.drawImage(image, x, y)
    this._context = context
  }

  public test(normalizedX: number, normalizedY: number): boolean {
    const x = ((normalizedX + 1) / 2) * 640
    const y = (1 - (normalizedY + 1) / 2) * 480
    const pixel = this._context.getImageData(x, y, 1, 1).data
    return pixel[3] > 0
  }
}

export class Dashboard {
  private _scene: THREE.Scene
  private _camera: THREE.OrthographicCamera
  private _canvas: HTMLCanvasElement
  private _context: CanvasRenderingContext2D
  private _texture: THREE.CanvasTexture
  private _material: THREE.MeshBasicMaterial
  private _mesh: THREE.Mesh
  private _velocity: number = 0
  private _dashboardImage: HTMLImageElement | null = null
  private _armsMask: Mask | null = null
  private _hornMask: Mask | null = null
  private _hornUpPosition = new THREE.Vector2()
  private _hornUpImage: HTMLImageElement | null = null
  private _hornDownPosition = new THREE.Vector2()
  private _hornDownImage: HTMLImageElement | null = null
  private _hornSound: AudioAction | null = null
  private _infoMask: Mask | null = null
  private _infoUpImage: HTMLImageElement | null = null
  private _infoDownImage: HTMLImageElement | null = null
  private _infoPosition = new THREE.Vector2()

  public onExit: () => void = () => {}
  public onInfoButtonClicked: () => void = () => {}

  constructor() {
    this._canvas = document.createElement('canvas')
    const context = this._canvas.getContext('2d')
    if (context == null) {
      throw new Error('HUD canvas context not found')
    }
    this._context = context

    this._scene = new THREE.Scene()
    this._texture = new THREE.CanvasTexture(this._canvas)
    this._texture.colorSpace = THREE.SRGBColorSpace
    this._material = new THREE.MeshBasicMaterial({ map: this._texture, transparent: true })
    this._mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._material)
    this._mesh.position.z = -1
    this._camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10)
    this._scene.add(this._mesh)
  }

  public resize(width: number, height: number): void {
    this._canvas.width = width
    this._canvas.height = height
    this._camera.updateProjectionMatrix()
  }

  public pointerDown(normalizedX: number, normalizedY: number): void {
    if (this._armsMask?.test(normalizedX, normalizedY)) {
      this.onExit()
    }

    if (this._hornMask?.test(normalizedX, normalizedY)) {
      if (this._hornDownImage != null && this._infoUpImage != null) {
        this._context.clearRect(0, 0, this._canvas.width, this._canvas.height)
        this._drawDashboard()
        this._drawImage(this._hornDownImage, this._hornDownPosition.x, this._hornDownPosition.y)
        this._drawImage(this._infoUpImage, this._infoPosition.x, this._infoPosition.y)
        this._texture.needsUpdate = true
      }

      if (this._hornSound != null) {
        engine.playAudio(this._hornSound)
      }
    }

    if (this._infoMask?.test(normalizedX, normalizedY)) {
      this.onInfoButtonClicked()

      if (this._infoDownImage != null) {
        this._drawImage(this._infoDownImage, this._infoPosition.x, this._infoPosition.y)
      }
    }
  }

  public pointerUp(): void {
    if (this._hornUpImage != null) {
      this._context.clearRect(0, 0, this._canvas.width, this._canvas.height)
      this._drawDashboard()
      this._drawImage(this._hornUpImage, this._hornUpPosition.x, this._hornUpPosition.y)
      this._texture.needsUpdate = true
    }

    if (this._infoUpImage != null) {
      this._drawImage(this._infoUpImage, this._infoPosition.x, this._infoPosition.y)
    }
  }

  private _drawImage(image: HTMLImageElement, x: number, y: number): void {
    const posX = (x / 640) * this._canvas.width
    const posY = (y / 480) * this._canvas.height
    const width = (image.width / 640) * this._canvas.width
    const height = (image.height / 480) * this._canvas.height
    this._context.drawImage(image, posX, posY, width, height)
    this._texture.needsUpdate = true
  }

  private _drawDashboard(): void {
    if (this._dashboardImage == null) {
      return
    }

    const aspect = this._dashboardImage.width / this._dashboardImage.height
    const drawWidth = this._canvas.width
    const drawHeight = drawWidth / aspect
    const y = this._canvas.height - drawHeight
    this._context.drawImage(this._dashboardImage, 0, y, drawWidth, drawHeight)
    this._texture.needsUpdate = true
  }

  public async show(action: { type: Action.Type.ParallelAction; children: readonly Child[] }): Promise<void> {
    this.clear()

    // enforce type narrowing, for some reason ts fails to infer fileType as non-null
    const isImageAction = (child?: Child): child is { id: number; type: Action.Type; siFile: string; fileType: Action.FileType.STL; children: readonly Child[]; name: string; presenter: string | null; location: readonly [number, number, number] } => child?.fileType === Action.FileType.STL
    const isAudioAction = (child?: Child): child is { id: number; type: Action.Type; siFile: string; fileType: Action.FileType.WAV; children: readonly Child[]; name: string; presenter: null; location: readonly [number, number, number]; volume: number } =>
      child?.fileType === Action.FileType.WAV && 'volume' in child && child.presenter === null

    const dashboardAction = action.children.find(child => child.type === Action.Type.Still && child.name.endsWith('Dashboard_Bitmap'))
    if (!isImageAction(dashboardAction)) {
      throw new Error('Dashboard image not found')
    }

    this._dashboardImage = await getImage(dashboardAction)
    this._drawDashboard()

    const armsAction = action.children.find(child => child.presenter === 'MxControlPresenter' && child.name.endsWith('Arms_Ctl'))?.children.find(child => child.type === Action.Type.Still && child.name.endsWith('Arms_Mask_Bitmap'))
    if (!isImageAction(armsAction)) {
      throw new Error('Arms mask image not found')
    }

    this._armsMask = new Mask(await getImage(armsAction), armsAction.location[0], armsAction.location[1])

    const hornAction = action.children.find(child => child.presenter === 'MxControlPresenter' && child.name.endsWith('Horn_Ctl'))
    if (hornAction != null) {
      const sound = action.children.find(child => child.fileType === Action.FileType.WAV && child.name.endsWith('Horn_Sound'))
      if (!isAudioAction(sound)) {
        throw new Error('Horn sound not found')
      }
      this._hornSound = sound

      const hornUpAction = hornAction.children.find(child => child.type === Action.Type.Still && child.name.endsWith('Up_Bitmap'))
      if (!isImageAction(hornUpAction)) {
        throw new Error('Horn up image not found')
      }

      this._hornUpImage = await getImage(hornUpAction)
      this._drawImage(this._hornUpImage, hornUpAction.location[0], hornUpAction.location[1])
      this._hornMask = new Mask(this._hornUpImage, hornUpAction.location[0], hornUpAction.location[1])
      this._hornUpPosition.set(hornUpAction.location[0], hornUpAction.location[1])

      const hornDownAction = hornAction.children.find(child => child.type === Action.Type.ParallelAction && child.name.endsWith('HornDown'))?.children.find(child => child.type === Action.Type.Still && child.name.endsWith('Down_Bitmap'))
      if (!isImageAction(hornDownAction)) {
        throw new Error('Horn down image not found')
      }

      this._hornDownImage = await getImage(hornDownAction)
      this._hornDownPosition.set(hornDownAction.location[0], hornDownAction.location[1])
    }

    const infoAction = action.children.find(child => child.presenter === 'MxControlPresenter' && child.name.endsWith('Info_Ctl'))
    if (infoAction == null) {
      throw new Error('Info button not found')
    }

    const infoUpAction = infoAction.children.find(child => child.type === Action.Type.Still && child.name.endsWith('InfoUp_Bitmap'))
    if (!isImageAction(infoUpAction)) {
      throw new Error('Info up image not found')
    }

    this._infoUpImage = await getImage(infoUpAction)
    this._drawImage(this._infoUpImage, infoUpAction.location[0], infoUpAction.location[1])
    this._infoMask = new Mask(this._infoUpImage, infoUpAction.location[0], infoUpAction.location[1])
    this._infoPosition.set(infoUpAction.location[0], infoUpAction.location[1])

    const infoDownAction = infoAction.children.find(child => child.type === Action.Type.Still && child.name.endsWith('InfoDown_Bitmap'))
    if (!isImageAction(infoDownAction)) {
      throw new Error('Info down image not found')
    }

    this._infoDownImage = await getImage(infoDownAction)
  }

  public clear(): void {
    this._hornSound = null
    this._hornUpImage = null
    this._hornDownImage = null
    this._hornMask = null

    this._infoUpImage = null
    this._infoDownImage = null
    this._infoMask = null

    this._context.clearRect(0, 0, this._canvas.width, this._canvas.height)
    this._texture.needsUpdate = true
  }

  public update(velocity: number): void {
    this._velocity = velocity
  }

  public async render(renderer: THREE.WebGLRenderer): Promise<void> {
    renderer.render(this._scene, this._camera)
  }
}
