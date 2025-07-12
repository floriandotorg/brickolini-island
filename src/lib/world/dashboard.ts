import * as THREE from 'three'
import { type AudioAction, type ControlAction, type ImageAction, isAudioAction, isControlAction, isImageAction, type ParallelAction } from '../action-types'
import { Control } from '../assets/control'
import { getImage } from '../assets/image'
import { engine } from '../engine'

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
  private _armsMask: Control | null = null
  private _hornControl: Control | null = null
  private _hornSound: AudioAction | null = null
  private _infoControl: Control | null = null

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
    if (this._armsMask?.pointerDown(normalizedX, normalizedY)) {
      this.onExit()
    }

    if (this._hornControl?.pointerDown(normalizedX, normalizedY)) {
      this._context.clearRect(0, 0, this._canvas.width, this._canvas.height)
      this._drawDashboard()
      this._hornControl.draw(this._context)
      this._infoControl?.draw(this._context)
      this._texture.needsUpdate = true

      if (this._hornSound != null) {
        engine.playAudio(this._hornSound)
      }
    }

    if (this._infoControl?.pointerDown(normalizedX, normalizedY)) {
      this.onInfoButtonClicked()
      this._infoControl.draw(this._context)
      this._texture.needsUpdate = true
    }
  }

  public pointerUp(): void {
    this._context.clearRect(0, 0, this._canvas.width, this._canvas.height)
    this._drawDashboard()
    if (this._hornControl != null) {
      this._hornControl.pointerUp()
      this._hornControl.draw(this._context)
      this._texture.needsUpdate = true
    }

    if (this._infoControl != null) {
      this._infoControl.pointerUp()
      this._infoControl.draw(this._context)
      this._texture.needsUpdate = true
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

  public async show(action: ParallelAction<ImageAction | AudioAction | ControlAction>): Promise<void> {
    this.clear()

    const dashboardAction = action.children.find(child => child.name.endsWith('Dashboard_Bitmap'))
    if (dashboardAction == null || !isImageAction(dashboardAction)) {
      throw new Error('Dashboard image not found')
    }

    this._dashboardImage = await getImage(dashboardAction)
    this._drawDashboard()

    const armsAction = action.children.find(child => child.name.endsWith('Arms_Ctl'))
    if (armsAction == null || !isControlAction(armsAction)) {
      throw new Error('Arms control not found')
    }

    const armsMaskAction = armsAction.children.find(child => child.name.endsWith('Arms_Mask_Bitmap'))
    if (!isImageAction(armsMaskAction)) {
      throw new Error('Arms mask image not found')
    }

    this._armsMask = await Control.create(armsAction)

    const hornAction = action.children.find(child => child.name.endsWith('Horn_Ctl'))
    if (hornAction != null && isControlAction(hornAction)) {
      this._hornControl = await Control.create(hornAction)
      this._hornControl.draw(this._context)
      const sound = action.children.find(child => isAudioAction(child) && child.name.endsWith('Horn_Sound'))
      if (!isAudioAction(sound)) {
        throw new Error('Horn sound not found')
      }
      this._hornSound = sound
    }

    const infoAction = action.children.find(child => child.name.endsWith('Info_Ctl'))
    if (infoAction == null || !isControlAction(infoAction)) {
      throw new Error('Info button not found')
    }

    this._infoControl = await Control.create(infoAction)
    this._infoControl.draw(this._context)
    this._texture.needsUpdate = true
  }

  public clear(): void {
    this._hornSound = null
    this._hornControl = null
    this._infoControl = null

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
