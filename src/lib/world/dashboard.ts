import * as THREE from 'three'
import { type AudioAction, type ControlAction, getExtraValue, type ImageAction, isAudioAction, isControlAction, isImageAction, isMeterAction, type MeterAction, type ParallelAction } from '../action-types'
import { CanvasSprite } from '../assets/canvas-sprite'
import { Control } from '../assets/control'
import { getImage } from '../assets/image'
import { type Composer, Render2D } from '../effect/composer'
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
  private readonly _fillColor: string
  private readonly _image: HTMLImageElement
  private readonly _sprite: CanvasSprite
  private readonly _direction: (width: number, height: number, fill: number) => { x: number; y: number; width: number; height: number }
  private _fill: number = 0

  private constructor(action: MeterAction, image: HTMLImageElement, canvasWidth: number, canvasHeight: number) {
    const fillerIndex = parseInt(getExtraValue(action, 'filler_index') ?? '')
    const fillColor = Number.isInteger(fillerIndex) && fillerIndex > 0 ? action.colorPalette.at(fillerIndex) : null
    if (fillColor == null) {
      throw new Error('The filler_index is not a valid index')
    }
    this._fillColor = fillColor

    this._image = image
    this._sprite = new CanvasSprite(action.location[0], action.location[1], image.width, image.height, canvasWidth, canvasHeight)

    const directionType = getExtraValue(action, 'type')
    this._direction = directionType != null ? parseDirection(directionType) : leftToRight

    this._fill = 1 // force redraw
    this.draw(0)
  }

  public static async create(action: MeterAction): Promise<Meter> {
    const image = await getImage(action)
    return new Meter(action, image, 640, 480)
  }

  public get sprite(): THREE.Sprite {
    return this._sprite.sprite
  }

  public draw(fill: number): void {
    if (this._fill !== fill) {
      this._fill = fill
      const { x, y, width, height } = this._direction(this._image.width, this._image.height, fill)
      this._sprite.context.globalCompositeOperation = 'copy'
      this._sprite.context.drawImage(this._image, 0, 0)
      this._sprite.context.globalCompositeOperation = 'source-atop'
      this._sprite.context.fillStyle = this._fillColor
      this._sprite.context.fillRect(x, y, width, height)
      this._sprite.needsUpdate = true
    }
  }
}

export class Dashboard {
  private _render = new Render2D()
  private _canvas: HTMLCanvasElement
  private _context: CanvasRenderingContext2D
  private _texture: THREE.CanvasTexture
  private _material: THREE.MeshBasicMaterial
  private _mesh: THREE.Mesh
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

    this._texture = new THREE.CanvasTexture(this._canvas)
    this._texture.colorSpace = THREE.SRGBColorSpace
    this._material = new THREE.MeshBasicMaterial({ map: this._texture, transparent: true })
    this._mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._material)
    this._mesh.position.z = -1
    this._render.scene.add(this._mesh)
  }

  public resize(width: number, height: number): void {
    this._canvas.width = width
    this._canvas.height = height
    this._render.resize(width, height)
  }

  public pointerDown(normalizedX: number, normalizedY: number): void {
    if (this._armsMask?.pointerDown(normalizedX, normalizedY)) {
      this.onExit()
    }

    if (this._hornControl?.pointerDown(normalizedX, normalizedY) && this._hornSound != null) {
      engine.playAudio(this._hornSound)
    }

    if (this._infoControl?.pointerDown(normalizedX, normalizedY)) {
      this.onInfoButtonClicked()
    }
  }

  public pointerUp(): void {
    if (this._hornControl != null) {
      this._hornControl.pointerUp()
    }

    if (this._infoControl != null) {
      this._infoControl.pointerUp()
    }
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
      if (isMeterAction(child)) {
        const variable = getExtraValue(child, 'variable')?.toLowerCase()
        if (variable == null) {
          throw new Error('Meter without variable is not supported')
        } else if (variable.endsWith('speed')) {
          this._speedMeter = await Meter.create(child)
          this._render.scene.add(this._speedMeter.sprite)
        } else if (variable.endsWith('fuel')) {
          this._fuelMeter = await Meter.create(child)
          // For now to at least show something
          this._fuelMeter.draw(0.5)
          this._render.scene.add(this._fuelMeter.sprite)
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

    this._armsMask = await Control.create(armsAction)

    const hornAction = action.children.find(child => child.name.endsWith('Horn_Ctl'))
    if (hornAction != null && isControlAction(hornAction)) {
      this._hornControl = await Control.create(hornAction)
      this._render.scene.add(this._hornControl.sprite)
      this._hornControl.draw()
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
    this._render.scene.add(this._infoControl.sprite)
    this._infoControl.draw()
  }

  public clear(): void {
    this._hornControl?.sprite.removeFromParent()
    this._infoControl?.sprite.removeFromParent()
    this._speedMeter?.sprite.removeFromParent()
    this._fuelMeter?.sprite.removeFromParent()

    this._hornSound = null
    this._hornControl = null
    this._infoControl = null
    this._speedMeter = null
    this._fuelMeter = null

    this._context.clearRect(0, 0, this._canvas.width, this._canvas.height)
    this._texture.needsUpdate = true
  }

  public update(velocity: number): void {
    this._speedMeter?.draw(velocity)
  }

  public activate(composer: Composer): void {
    composer.add(this._render)
  }
}
