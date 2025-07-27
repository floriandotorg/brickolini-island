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

const createPlacedImage = async (action: ImageAction, willReadFrequently: boolean = false): Promise<PlacedImage> => {
  const ORIGINAL_WIDTH = 640
  const ORIGINAL_HEIGHT = 480
  const image = await getImage(action)
  const normalizedX = (action.location[0] / ORIGINAL_WIDTH) * 2 - 1
  const normalizedY = -(action.location[1] / ORIGINAL_HEIGHT) * 2 + 1
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently })
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
  private readonly _states: [number, number, number][]

  public constructor(mask: PlacedImage, images: PlacedImage[], states: [number, number, number][]) {
    if (images.length !== 0 && states.length !== 0 && images.length !== states.length) {
      throw new Error('No images and states defined for Map')
    }
    this._state = 0
    this._mask = mask
    this._images = images
    this._states = states
  }

  public pointerDown(normalizedX: number, normalizedY: number): boolean {
    const pixel = getPixel(this._mask, normalizedX, normalizedY)
    if (pixel == null || pixel[3] === 0) {
      return false
    }
    if (this._states.length === 0) {
      this._state = 1
      return true
    }
    this._state = 0
    for (const [index, state] of this._states.entries()) {
      if (state[0] === pixel[0] && state[1] === pixel[1] && state[2] === pixel[2]) {
        this._state = index + 1
        console.log(this._state)
        return true
      }
    }
    return false
  }

  public pointerUp(): boolean {
    this._state = 0
    return true
  }

  public get image(): PlacedImage | null {
    return this._state === 0 || this._images.length === 0 ? null : this._images[this._state - 1]
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

type WithColorPalette = { colorPalette: string[] }

const isWithColorPalette = (action: unknown): action is WithColorPalette => action != null && typeof action === 'object' && 'colorPalette' in action && Array.isArray(action.colorPalette)

export class Control {
  private readonly _action: ControlAction
  private readonly _sprite: CanvasSprite
  private readonly _handler: Handler

  public static async create(action: ControlAction): Promise<Control> {
    const styleValue = getExtraValue(action, 'Style')
    // This is currently a very basic implementation
    const [style, ...styleParams] = styleValue == null ? [''] : splitExtraValue(styleValue)
    switch (style.toLowerCase()) {
      case 'map': {
        const maskAction = action.children[0]
        if (maskAction == null || !isImageAction(maskAction)) {
          throw new Error('Unknown first child action')
        }
        if (maskAction.extra?.toLowerCase() !== 'bmp_ismap') {
          throw new Error('Unknown mask extra string')
        }
        const colorState: [number, number, number][] = []
        if (styleParams.length > 0) {
          const stateCount = parseInt(styleParams[0])
          if (!Number.isInteger(stateCount) && stateCount < 1) {
            throw new Error('State count in map-style is not a positive integer')
          }
          if (stateCount !== styleParams.length - 1) {
            throw new Error('Invalid state count in map')
          }
          if (!isWithColorPalette(maskAction)) {
            throw new Error('Multiple states without color palette')
          }
          for (const param of styleParams.slice(1)) {
            const state = parseInt(param)
            if (!Number.isInteger(state) && state < 1 && state < maskAction.colorPalette.length) {
              throw new Error('State in map-style is not a positive integer')
            }
            const color = maskAction.colorPalette[state]
            const colorMatch = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/)
            if (colorMatch == null) {
              throw new Error(`Unknown color '${color}"`)
            }
            const r = parseInt(colorMatch[1], 16)
            const g = parseInt(colorMatch[2], 16)
            const b = parseInt(colorMatch[3], 16)
            colorState.push([r, g, b])
          }
        }
        const mask = await createPlacedImage(maskAction, true)
        const stateImages = []
        for (const child of action.children.slice(1)) {
          const image = getImageAction(child)
          stateImages.push(await createPlacedImage(image))
        }
        return new Control(action, new MapControl(mask, stateImages, colorState))
      }
      case 'toggle': // TODO: Properly handle this state
      case '': {
        if (styleParams.length > 0) {
          throw new Error(`Style parameters in ${style} is not supported`)
        }
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
