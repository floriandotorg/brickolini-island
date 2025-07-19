import type * as THREE from 'three'
import { type ControlAction, getExtraValue, type ImageAction, isImageAction, type ParallelActionTuple, splitExtraValue } from '../action-types'
import { CanvasSprite } from './canvas-sprite'
import { getImage } from './image'

export class Mask {
  private _context: CanvasRenderingContext2D

  constructor(image: CanvasImageSource, x: number, y: number) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (context == null) {
      throw new Error('Unable to create canvas context')
    }
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

type PlacedImage = { image: HTMLImageElement; x: number; y: number }

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
  return { image: await getImage(action), x: action.location[0], y: action.location[1] }
}

export class Control {
  private readonly _action: ControlAction
  private readonly _sprite: CanvasSprite
  private readonly _mask: Mask
  private readonly _stateImages: { readonly images: PlacedImage[]; readonly toggle: boolean; state: number } | null

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
        return new Control(action, new Mask(await getImage(maskAction), maskAction.location[0], maskAction.location[1]), null)
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
        return new Control(action, new Mask(up.image, up.x, up.y), { images: [up, down], toggle: style.toLowerCase() === 'toggle', state: 0 })
      }
      default:
        throw new Error(`Style ${style} not supported yet`)
    }
  }

  private constructor(action: ControlAction, mask: Mask, stateImages: { readonly images: PlacedImage[]; readonly toggle: boolean; state: number } | null) {
    this._action = action
    this._mask = mask
    this._stateImages = stateImages
    this._sprite = new CanvasSprite(0, 0, 640, 480, 640, 480)
  }

  public get sprite(): THREE.Sprite {
    return this._sprite.sprite
  }

  public get name(): string {
    return this._action.name
  }

  public pointerDown(normalizedX: number, normalizedY: number): boolean {
    if (this._mask.test(normalizedX, normalizedY)) {
      const stateImages = this._stateImages
      if (stateImages != null) {
        if (stateImages.toggle) {
          stateImages.state = 1 - stateImages.state
        } else {
          stateImages.state = 1
        }
        this.draw()
      }
      return true
    }
    return false
  }

  public pointerUp() {
    const stateImages = this._stateImages
    if (stateImages != null && !stateImages.toggle) {
      stateImages.state = 0
      this.draw()
    }
  }

  public draw(): void {
    const stateImages = this._stateImages
    if (stateImages == null) {
      return
    }
    const image = stateImages.images[stateImages.state]
    if (image == null) {
      throw new Error(`Invalid state ${stateImages.state}`)
    }
    const posX = (image.x / 640) * this._sprite.context.canvas.width
    const posY = (image.y / 480) * this._sprite.context.canvas.height
    const width = (image.image.width / 640) * this._sprite.context.canvas.width
    const height = (image.image.height / 480) * this._sprite.context.canvas.height
    this._sprite.context.drawImage(image.image, posX, posY, width, height)
    this._sprite.needsUpdate = true
  }
}
