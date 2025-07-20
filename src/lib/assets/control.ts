import type * as THREE from 'three'
import { type ControlAction, getExtraValue, type ImageAction, isImageAction, type ParallelActionTuple, splitExtraValue } from '../action-types'
import { CanvasSprite } from './canvas-sprite'
import { getImage } from './image'

type PlacedImage = { context: CanvasRenderingContext2D; normalizedX: number; normalizedY: number; normalizedWidth: number; normalizedHeight: number }

type ControlChild = ImageAction | ParallelActionTuple<readonly [ImageAction]>

const getImageAction = (action: ControlChild | undefined): ImageAction => {
  if (action == null) {
    throw new Error('Action is not defined')
  }
  if (isImageAction(action)) {
    return action
  }
  return action.children[0]
}

const createPlacedImage = async (action: ImageAction): Promise<PlacedImage> => {
  const ORIGINAL_WIDTH = 640
  const ORIGINAL_HEIGHT = 480
  const image = await getImage(action)
  const normalizedX = (action.location[0] / ORIGINAL_WIDTH) * 2 - 1
  const normalizedY = -(action.location[1] / ORIGINAL_HEIGHT) * 2 + 1
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (context == null) {
    throw new Error('Unable to create canvas context')
  }
  canvas.width = image.width
  canvas.height = image.height
  context.drawImage(image, 0, 0)
  return { context, normalizedX, normalizedY, normalizedWidth: (image.width / ORIGINAL_WIDTH) * 2, normalizedHeight: (image.height / ORIGINAL_HEIGHT) * 2 }
}

const denormalize = (normalizedX: number, normalizedY: number, totalSize: [number, number] = [640, 480]): [number, number] => {
  const x = ((normalizedX + 1) / 2) * totalSize[0]
  const y = (1 - (normalizedY + 1) / 2) * totalSize[1]
  return [x, y]
}

const getPixel = (image: PlacedImage, normalizedX: number, normalizedY: number): [number, number, number, number] | null => {
  const rectX = normalizedX - image.normalizedX
  const rectY = normalizedY - image.normalizedY
  if (rectX < 0 || rectY > 0 || rectX > image.normalizedWidth || rectY < -image.normalizedHeight) {
    return null
  }
  const x = (rectX / image.normalizedWidth) * image.context.canvas.width
  const y = (-rectY / image.normalizedHeight) * image.context.canvas.height
  const [r, g, b, a] = image.context.getImageData(x, y, 1, 1).data
  return [r, g, b, a]
}

interface Handler {
  pointerDown(normalizedX: number, normalizedY: number): boolean

  pointerUp(): boolean

  get image(): PlacedImage | null
}

class MapControl implements Handler {
  private _state: number
  private readonly _mask: PlacedImage
  private readonly _images: PlacedImage[]

  public constructor(mask: PlacedImage, images: PlacedImage[]) {
    this._state = 0
    this._mask = mask
    this._images = images
  }

  public pointerDown(normalizedX: number, normalizedY: number): boolean {
    const pixel = getPixel(this._mask, normalizedX, normalizedY)
    if (pixel == null || pixel[3] === 0) {
      return false
    }
    // TODO: Need to check via the palette which state was actually clicked
    this._state = 1
    return true
  }

  public pointerUp(): boolean {
    this._state = 0
    return true
  }

  public get image(): PlacedImage | null {
    return this._state === 0 ? null : this._images[this._state - 1]
  }
}

class ToggleControl implements Handler {
  private _pressedState: boolean
  private readonly _idleImage: PlacedImage
  private readonly _pressedImage: PlacedImage
  private readonly _toggle: boolean

  public constructor(idleImage: PlacedImage, pressedImage: PlacedImage, toggle: boolean) {
    this._pressedState = false
    this._idleImage = idleImage
    this._pressedImage = pressedImage
    this._toggle = toggle
  }

  private test(normalizedX: number, normalizedY: number): boolean {
    const pixel = getPixel(this.image, normalizedX, normalizedY)
    if (pixel == null) {
      return false
    }
    return pixel[3] > 0
  }

  public pointerDown(normalizedX: number, normalizedY: number): boolean {
    if (this.test(normalizedX, normalizedY)) {
      if (!this._toggle) {
        this._pressedState = true
      } else {
        this._pressedState = !this._pressedState
      }
      return true
    }
    return false
  }

  public pointerUp(): boolean {
    if (!this._toggle) {
      this._pressedState = false
      return true
    }
    return false
  }

  public get image(): PlacedImage {
    return this._pressedState ? this._pressedImage : this._idleImage
  }
}

export class Control {
  private readonly _action: ControlAction
  private readonly _sprite: CanvasSprite
  private readonly _handler: Handler

  public static async create(action: ControlAction): Promise<Control> {
    const styleValue = getExtraValue(action, 'Style')
    // This is currently a very basic implementation
    const [style, ...styleParams] = styleValue == null ? [''] : splitExtraValue(styleValue)
    if (styleParams.length > 0) {
      throw new Error('Style parameters are not supported yet')
    }
    switch (style.toLowerCase()) {
      case 'map': {
        const maskAction = action.children[0]
        if (maskAction == null || !isImageAction(maskAction)) {
          throw new Error('Unknown first child action')
        }
        if (maskAction.extra?.toLowerCase() !== 'bmp_ismap') {
          throw new Error('Unknown mask extra string')
        }
        const mask = await createPlacedImage(maskAction)
        const stateImages = []
        for (const image of action.children.slice(1)) {
          if (!isImageAction(image)) {
            throw new Error('Unknown first child action')
          }
          stateImages.push(await createPlacedImage(image))
        }
        return new Control(action, new MapControl(mask, stateImages))
      }
      case 'toggle': // TODO: Properly handle this state
      case '': {
        const upAction = action.children[0]
        if (upAction == null || !isImageAction(upAction)) {
          throw new Error('Unknown up action')
        }
        const downAction = getImageAction(action.children[1])
        const up = await createPlacedImage(upAction)
        const down = await createPlacedImage(downAction)
        return new Control(action, new ToggleControl(up, down, style.toLowerCase() === 'toggle'))
      }
      default:
        throw new Error(`Style ${style} not supported yet`)
    }
  }

  private constructor(action: ControlAction, handler: Handler) {
    this._action = action
    this._handler = handler
    this._sprite = new CanvasSprite(0, 0, 640, 480, 640, 480)
  }

  public get sprite(): THREE.Sprite {
    return this._sprite.sprite
  }

  public get name(): string {
    return this._action.name
  }

  public pointerDown(normalizedX: number, normalizedY: number): boolean {
    if (this._handler.pointerDown(normalizedX, normalizedY)) {
      this.draw()
      return true
    }
    return false
  }

  public pointerUp() {
    if (this._handler.pointerUp()) {
      this.draw()
    }
  }

  public draw(): void {
    const image = this._handler.image
    if (image == null) {
      this._sprite.clear()
      return
    }
    const [x, y] = denormalize(image.normalizedX, image.normalizedY, [this._sprite.context.canvas.width, this._sprite.context.canvas.height])
    const width = (image.normalizedWidth * this._sprite.context.canvas.width) / 2
    const height = (image.normalizedHeight * this._sprite.context.canvas.height) / 2
    this._sprite.context.drawImage(image.context.canvas, x, y, width, height)
    this._sprite.needsUpdate = true
  }
}
