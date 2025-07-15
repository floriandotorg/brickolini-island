import * as THREE from 'three'
import { type AudioAction, type ControlAction, getExtraValue, type ImageAction, isAudioAction, isControlAction, isImageAction, type ParallelAction } from '../action-types'
import { Control } from '../assets/control'
import { getImage } from '../assets/image'
import { engine } from '../engine'

const leftToRight = (width: number, height: number, fill: number): { x: number; y: number; width: number; height: number } => {
  return {
    x: 0,
    y: 0,
    width: width * fill,
    height: height,
  }
}

const rightToLeft = (width: number, height: number, fill: number): { x: number; y: number; width: number; height: number } => {
  return {
    x: width * (1 - fill),
    y: 0,
    width: width * fill,
    height: height,
  }
}

const bottomToTop = (width: number, height: number, fill: number): { x: number; y: number; width: number; height: number } => {
  return {
    x: 0,
    y: height * (1 - fill),
    width: width,
    height: height * fill,
  }
}

const topToBottom = (width: number, height: number, fill: number): { x: number; y: number; width: number; height: number } => {
  return {
    x: 0,
    y: 0,
    width: width,
    height: height * fill,
  }
}

const parseDirection = (value: string): ((width: number, height: number, fill: number) => { x: number; y: number; width: number; height: number }) => {
  switch (value) {
    case 'left_to_right':
      return leftToRight
    case 'right_to_left':
      return rightToLeft
    case 'bottom_to_top':
      return bottomToTop
    case 'top_to_bottom':
      return topToBottom
    default:
      throw new Error(`unknown direction value ${value}`)
  }
}

class Meter {
  private readonly _image: HTMLImageElement
  private readonly _canvas: HTMLCanvasElement
  private readonly _context: CanvasRenderingContext2D
  private readonly _texture: THREE.CanvasTexture
  private readonly _mesh: THREE.Mesh
  private readonly _direction: (width: number, height: number, fill: number) => { x: number; y: number; width: number; height: number }
  private fill: number = 0

  private constructor(action: ImageAction, image: HTMLImageElement, canvasWidth: number, canvasHeight: number) {
    const normalizedX = (action.location[0] / canvasWidth) * 2 - 1
    const normalizedY = -((action.location[1] / canvasHeight) * 2 - 1)
    const normalizedWidth = (image.width / canvasWidth) * 2
    const normalizedHeight = (image.height / canvasHeight) * 2

    this._image = image

    this._canvas = document.createElement('canvas')
    this._canvas.width = image.width
    this._canvas.height = image.height
    const context = this._canvas.getContext('2d')
    if (context == null) {
      throw new Error('HUD canvas context not found')
    }
    this._context = context
    this._texture = new THREE.CanvasTexture(this._canvas)
    this._texture.colorSpace = THREE.SRGBColorSpace
    const material = new THREE.MeshBasicMaterial({ map: this._texture, transparent: true })
    this._mesh = new THREE.Mesh(new THREE.PlaneGeometry(normalizedWidth, normalizedHeight), material)
    this._mesh.position.set(normalizedX + normalizedWidth / 2, normalizedY - normalizedHeight / 2, 0)

    const directionType = getExtraValue(action, 'type')
    this._direction = directionType != null ? parseDirection(directionType) : leftToRight
  }

  public static async create(action: ImageAction): Promise<Meter> {
    const image = await getImage(action)
    return new Meter(action, image, 640, 480)
  }

  public get mesh(): THREE.Mesh {
    return this._mesh
  }

  public draw(fill: number): void {
    if (this.fill !== fill) {
      this.fill = fill
      const { x, y, width, height } = this._direction(this._image.width, this._image.height, fill)
      console.log({ x, y, width, height })
      this._context.clearRect(0, 0, this._context.canvas.width, this._context.canvas.height)
      this._context.drawImage(this._image, x, y, width, height, x, y, width, height)
      this._texture.needsUpdate = true
    }
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
  private _armsMask: Control | null = null
  private _hornControl: Control | null = null
  private _hornSound: AudioAction | null = null
  private _infoControl: Control | null = null
  private _speedMeter: Meter | null = null
  private _fuelMeter: Meter | null = null

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

    for (const child of action.children) {
      if (isImageAction(child) && child.presenter === 'LegoMeterPresenter') {
        const variable = getExtraValue(child, 'variable')?.toLowerCase()
        if (variable == null) {
          throw new Error('Meter without variable is not supported')
        } else if (variable.endsWith('speed')) {
          this._speedMeter = await Meter.create(child)
          this._scene.add(this._speedMeter.mesh)
        } else if (variable.endsWith('fuel')) {
          this._fuelMeter = await Meter.create(child)
          // For now to at least show something
          this._fuelMeter.draw(0.5)
          this._scene.add(this._fuelMeter.mesh)
        }
      }
    }

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
    this._speedMeter?.mesh.removeFromParent()
    this._fuelMeter?.mesh.removeFromParent()

    this._hornSound = null
    this._hornControl = null
    this._infoControl = null
    this._speedMeter = null
    this._fuelMeter = null

    this._context.clearRect(0, 0, this._canvas.width, this._canvas.height)
    this._texture.needsUpdate = true
  }

  public update(velocity: number): void {
    this._velocity = velocity
    this._speedMeter?.draw(velocity)
  }

  public async render(renderer: THREE.WebGLRenderer): Promise<void> {
    renderer.render(this._scene, this._camera)
  }
}
