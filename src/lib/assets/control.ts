import * as THREE from 'three'
import { type ActionBase, type ControlAction, getExtraValue, type ImageAction, isImageAction, type ParallelActionTuple, splitExtraValue } from '../action-types'
import type { Render2D } from '../effect/composer'
import { engine, type NormalizedRect, normalizeRect, normalizeZ } from '../engine'
import { switchWorld } from '../switch-world'
import { setImageSprite } from './canvas-sprite'
import { getImage } from './image'

type PlacedImage = { context: CanvasRenderingContext2D; action: ImageAndOtherAction; normalizedRect: NormalizedRect }

type ControlChild = ImageAction | ParallelActionTuple<readonly [ImageAction, ActionBase?]>
type ImageAndOtherAction = { image: ImageAction; other?: ActionBase }

const getImageAction = (action: ControlChild | undefined): ImageAndOtherAction => {
  if (action == null) {
    throw new Error('Action is not defined')
  }
  if (isImageAction(action)) {
    return { image: action }
  }
  let image: ImageAction | undefined
  let other: ActionBase | undefined
  for (const child of action.children) {
    if (isImageAction(child)) {
      if (image != null) {
        throw new Error(`Multiple image actions found as children of ${action.id}`)
      }
      image = child
    } else if (child != null) {
      if (other != null) {
        throw new Error(`Multiple other actions found as children of ${action.id}`)
      }
      other = child
    }
  }
  if (image == null) {
    throw new Error('Action and children are no image action')
  }
  return { image, other }
}

const createPlacedImage = async (action: ImageAndOtherAction, willReadFrequently = false): Promise<PlacedImage> => {
  const image = await getImage(action.image)
  const normalizedRect = normalizeRect(action.image.location[0], action.image.location[1], image.width, image.height)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently })
  if (context == null) {
    throw new Error('Unable to create canvas context')
  }
  canvas.width = image.width
  canvas.height = image.height
  context.drawImage(image, 0, 0)
  return { context, action, normalizedRect }
}

const getPixel = (image: PlacedImage, normalizedX: number, normalizedY: number): [number, number, number, number] | null => {
  const normalizedInRect = image.normalizedRect.renormalize(normalizedX, normalizedY)
  if (normalizedInRect == null) {
    return null
  }
  const x = normalizedInRect[0] * image.context.canvas.width
  const y = normalizedInRect[1] * image.context.canvas.height
  const [r, g, b, a] = image.context.getImageData(x, y, 1, 1).data
  return [r, g, b, a]
}

interface Handler {
  test(normalizedX: number, normalizedY: number): boolean

  pointerDown(normalizedX: number, normalizedY: number): ControlEvent | null

  pointerUp(): boolean

  get image(): ImageAction | null
}

class MapControl implements Handler {
  private _state: number
  private readonly _mask: PlacedImage
  private readonly _images: ImageAndOtherAction[]
  private readonly _states: [number, number, number][]

  public constructor(mask: PlacedImage, images: ImageAndOtherAction[], states: [number, number, number][]) {
    if (images.length !== 0 && states.length !== 0 && images.length !== states.length) {
      throw new Error('Number of states and images does not match')
    }
    this._state = 0
    this._mask = mask
    this._images = images
    this._states = states
  }

  private getPixel(normalizedX: number, normalizedY: number): [number, number, number] | null {
    const pixel = getPixel(this._mask, normalizedX, normalizedY)
    if (pixel == null || pixel[3] === 0) {
      return null
    }
    return [pixel[0], pixel[1], pixel[2]]
  }

  public test(normalizedX: number, normalizedY: number): boolean {
    return this.getPixel(normalizedX, normalizedY) != null
  }

  public pointerDown(normalizedX: number, normalizedY: number): ControlEvent | null {
    const pixel = this.getPixel(normalizedX, normalizedY)
    if (pixel == null) {
      return null
    }
    if (this._states.length === 0) {
      this._state = 1
      return { state: this._state }
    }
    for (const [index, state] of this._states.entries()) {
      if (state[0] === pixel[0] && state[1] === pixel[1] && state[2] === pixel[2]) {
        this._state = index + 1
        return { state: this._state, otherAction: this._images[index].other }
      }
    }
    return null
  }

  public pointerUp(): boolean {
    const stateBefore = this._state
    this._state = 0
    return this._state !== stateBefore
  }

  public get image(): ImageAction | null {
    return this._state === 0 || this._images.length === 0 ? null : this._images[this._state - 1].image
  }
}

class GridControl implements Handler {
  private _state: number
  private readonly _idleImage: PlacedImage
  private readonly _stateImages: ImageAndOtherAction[]
  public readonly numberOfColumns: number

  public constructor(idleImage: PlacedImage, stateImages: ImageAndOtherAction[], numberOfColumns: number) {
    if (stateImages.length === 0) {
      throw new Error('No images defined for Grid')
    }
    if (stateImages.length % numberOfColumns !== 0) {
      throw new Error('No pressed image for every cell defined')
    }
    this._state = 0
    this._idleImage = idleImage
    this._stateImages = stateImages
    this.numberOfColumns = numberOfColumns
  }

  public test(normalizedX: number, normalizedY: number): boolean {
    const pixel = getPixel(this._idleImage, normalizedX, normalizedY)
    if (pixel == null) {
      return false
    }
    return pixel[3] > 0
  }

  public pointerDown(normalizedX: number, normalizedY: number): ControlEvent | null {
    if (!this.test(normalizedX, normalizedY)) {
      return null
    }
    const renormalized = this._idleImage.normalizedRect.renormalize(normalizedX, normalizedY)
    if (renormalized == null) {
      return null
    }
    const col = Math.floor(renormalized[0] * this.numberOfColumns)
    const row = Math.floor(-renormalized[1] * this.numberOfRows)
    const index = row * this.numberOfColumns + col
    this._state = index + 1
    return { state: this._state, otherAction: this._stateImages[index].other }
  }

  public get numberOfRows(): number {
    return this._stateImages.length / this.numberOfColumns
  }

  public pointerUp(): boolean {
    const stateBefore = this._state
    this._state = 0
    return this._state !== stateBefore
  }

  public get image(): ImageAction | null {
    return this._state === 0 ? this._idleImage.action.image : this._stateImages[this._state - 1].image
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

  public test(normalizedX: number, normalizedY: number): boolean {
    const pixel = getPixel(this._placedImage, normalizedX, normalizedY)
    if (pixel == null) {
      return false
    }
    return pixel[3] > 0
  }

  public pointerDown(normalizedX: number, normalizedY: number): ControlEvent | null {
    if (this.test(normalizedX, normalizedY)) {
      if (!this._toggle) {
        this._pressedState = true
      } else {
        this._pressedState = !this._pressedState
      }
      return this._pressedState ? { state: 1, otherAction: this._pressedImage.action.other } : { state: 0, otherAction: this._idleImage.action.other }
    }
    return null
  }

  public pointerUp(): boolean {
    if (!this._toggle) {
      const stateBefore = this._pressedState
      this._pressedState = false
      return this._pressedState !== stateBefore
    }
    return false
  }

  private get _placedImage(): PlacedImage {
    return this._pressedState ? this._pressedImage : this._idleImage
  }

  public get image(): ImageAction {
    return this._placedImage.action.image
  }
}

type WithColorPalette = { colorPalette: string[] }

const isWithColorPalette = (action: unknown): action is WithColorPalette => action != null && typeof action === 'object' && 'colorPalette' in action && Array.isArray(action.colorPalette)

export type ControlEvent = { state: number; otherAction?: ActionBase }

export class Control {
  private readonly _action: ControlAction
  private readonly _sprite: THREE.Sprite
  private readonly _handler: Handler
  private _z = 0

  public static async create(action: ControlAction): Promise<Control> {
    try {
      const styleValue = getExtraValue(action, 'Style')
      // This is currently a very basic implementation
      const [style, ...styleParams] = styleValue == null ? [''] : splitExtraValue(styleValue)
      switch (style.toLowerCase()) {
        case 'map': {
          const maskAction = getImageAction(action.children[0]).image
          if (maskAction.extra?.toLowerCase() !== 'bmp_ismap') {
            throw new Error('Unknown mask extra string')
          }
          const colorState: [number, number, number][] = []
          if (styleParams.length > 0 && styleParams[0].length > 0) {
            const stateCount = Number.parseInt(styleParams[0], 10)
            if (!Number.isInteger(stateCount) || stateCount < 1) {
              throw new Error('State count in map-style is not a positive integer')
            }
            if (stateCount !== styleParams.length - 1) {
              throw new Error('Invalid state count in map')
            }
            if (!isWithColorPalette(maskAction)) {
              throw new Error('Multiple states without color palette')
            }
            for (const param of styleParams.slice(1)) {
              const state = Number.parseInt(param, 10)
              if (!Number.isInteger(state) || state < 1 || state >= maskAction.colorPalette.length) {
                throw new Error('State in map-style is not a positive integer')
              }
              const color = maskAction.colorPalette[state]
              const colorMatch = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/)
              if (colorMatch == null) {
                throw new Error(`Unknown color '${color}"`)
              }
              const r = Number.parseInt(colorMatch[1], 16)
              const g = Number.parseInt(colorMatch[2], 16)
              const b = Number.parseInt(colorMatch[3], 16)
              colorState.push([r, g, b])
            }
          }
          const mask = await createPlacedImage({ image: maskAction }, true)
          const stateImages = []
          for (const child of action.children.slice(1)) {
            const image = getImageAction(child)
            stateImages.push(image)
          }
          return new Control(action, new MapControl(mask, stateImages, colorState))
        }
        case 'grid': {
          // The original did parse them but only checked if they are two, so it could be in either order
          for (const param of styleParams) {
            const colsOrRows = Number.parseInt(param, 10)
            if (!Number.isInteger(colsOrRows) || colsOrRows !== 2) {
              throw new Error(`Number of columns or rows is not exactly 2 but '${param}'`)
            }
          }
          const idleAction = getImageAction(action.children[0])
          const rows = 2
          const columns = 2
          if (action.children.length !== rows * columns + 1) {
            throw new Error(`Invalid number of state images for ${rows} rows and ${columns} columns`)
          }
          const idleImage = await createPlacedImage(idleAction, true)
          const stateImages = []
          for (const child of action.children.slice(1)) {
            const image = getImageAction(child)
            stateImages.push(image)
          }
          return new Control(action, new GridControl(idleImage, stateImages, columns))
        }
        case 'toggle': // TODO: Properly handle this state
        case '': {
          if (styleParams.length > 0) {
            throw new Error(`Style parameters in ${style} is not supported`)
          }
          const upAction = getImageAction(action.children[0])
          const downAction = getImageAction(action.children[1])
          const up = await createPlacedImage(upAction)
          const down = await createPlacedImage(downAction)
          return new Control(action, new ToggleControl(up, down, style.toLowerCase() === 'toggle'))
        }
        default:
          throw new Error(`Style ${style} not supported yet`)
      }
    } catch (e) {
      throw new Error(`Unable to create control for '${action.name}'`, { cause: e })
    }
  }

  private constructor(action: ControlAction, handler: Handler) {
    this._action = action
    this._handler = handler
    this._sprite = new THREE.Sprite()
    this._sprite.name = `control_${this.name}`
    this.draw()
  }

  public get sprite(): THREE.Sprite {
    return this._sprite
  }

  public get name(): string {
    return this._action.name
  }

  public get visible(): boolean {
    return this._sprite.visible
  }

  public set visible(value: boolean) {
    this._sprite.visible = value
  }

  public get z(): number {
    return this._z
  }

  public test(normalizedX: number, normalizedY: number): boolean {
    return this._handler.test(normalizedX, normalizedY)
  }

  public pointerDown(normalizedX: number, normalizedY: number): ControlEvent | null {
    if (!this.visible) {
      return null
    }
    const result = this._handler.pointerDown(normalizedX, normalizedY)
    if (result != null) {
      this.draw()
    }
    return result
  }

  public pointerUp() {
    if (this.visible && this._handler.pointerUp()) {
      this.draw()
    }
  }

  public draw(): void {
    const image = this._handler.image
    if (image == null) {
      this._sprite.material.map?.dispose()
      this._sprite.material.map = null
      this._sprite.scale.set(0, 0, 0)
      this._z = 0
    } else {
      setImageSprite(this._sprite, image)
      this._z = image.location[2]
      this._sprite.position.z = normalizeZ(this._z)
    }
    this._sprite.material.needsUpdate = true
  }
}

export class ControlsCollection {
  private readonly _render: Render2D
  private readonly _controls: Control[] = []

  public constructor(render: Render2D) {
    this._render = render
  }

  public onButtonClicked: (buttonName: string, event: ControlEvent) => boolean = _buttonName => false

  public async addControl(action: ControlAction): Promise<void> {
    return Control.create(action).then(control => {
      this._controls.push(control)
      this._render.scene.add(control.sprite)
    })
  }

  public getControl(name: string): Control | null {
    for (const control of this._controls) {
      if (control.name === name) {
        return control
      }
    }
    return null
  }

  public pointerDown(normalizedX: number, normalizedY: number): boolean {
    for (const control of this._controls.toSorted((a, b) => a.z - b.z)) {
      const result = control.pointerDown(normalizedX, normalizedY)
      if (result != null) {
        if (engine.currentWorld.name !== 'infomain' && control.name === 'Info_Ctl') {
          void switchWorld({ ending: null })
          return true
        }

        const controlHandled = this.onButtonClicked(control.name, result)
        if (!controlHandled) {
          console.warn(`Button ${control.name} not handled`)
        }

        return controlHandled
      }
    }
    return false
  }

  public pointerUp(): void {
    for (const control of this._controls) {
      control.pointerUp()
    }
  }
}
