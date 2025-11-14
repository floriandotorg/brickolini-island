import * as THREE from 'three'
import type { ImageAction } from '../action-types'
import { normalizeRect } from '../engine'
import { createTexture } from './texture'

export const setScaleAndPosition = (sprite: THREE.Sprite, originalActionWidth: number, originalActionHeight: number, x: number, y: number, z?: number) => {
  const { normalizedX, normalizedY, normalizedWidth, normalizedHeight } = normalizeRect(x, y, originalActionWidth, originalActionHeight)
  sprite.scale.set(normalizedWidth, normalizedHeight, 1)
  sprite.position.set(normalizedX + normalizedWidth / 2, normalizedY - normalizedHeight / 2, z ?? sprite.position.z)
}

export const setImageSprite = (sprite: THREE.Sprite, bitmap: ImageAction, z?: number): void => {
  sprite.material.map?.dispose()
  setScaleAndPosition(sprite, bitmap.dimensions.width, bitmap.dimensions.height, bitmap.location[0], bitmap.location[1], z)
  sprite.material.map = createTexture(bitmap)
}

export const createNormalizedSprite = (x: number, y: number, z: number, originalActionWidth: number, originalActionHeight: number): THREE.Sprite => {
  const sprite = new THREE.Sprite()
  setScaleAndPosition(sprite, originalActionWidth, originalActionHeight, x, y, z)
  return sprite
}

export const createImageSprite = (bitmap: ImageAction, z: number): THREE.Sprite => {
  const sprite = new THREE.Sprite()
  sprite.name = `image_${bitmap.siFile}.${bitmap.id}`
  setImageSprite(sprite, bitmap, z)
  return sprite
}

export class CanvasSprite {
  private readonly _canvas: HTMLCanvasElement
  private readonly _context: CanvasRenderingContext2D
  private readonly _texture: THREE.CanvasTexture
  private readonly _sprite: THREE.Sprite

  public constructor(x: number, y: number, originalActionWidth: number, originalActionHeight: number) {
    this._canvas = document.createElement('canvas')
    this._canvas.width = originalActionWidth
    this._canvas.height = originalActionHeight
    const context = this._canvas.getContext('2d')
    if (context == null) {
      throw new Error('HUD canvas context not found')
    }
    this._context = context
    this._texture = new THREE.CanvasTexture(this._canvas)
    this._texture.colorSpace = THREE.SRGBColorSpace
    this._sprite = createNormalizedSprite(x, y, -0.5, originalActionWidth, originalActionHeight)
    this._sprite.material = new THREE.SpriteMaterial({ map: this._texture, transparent: true })
  }

  public get context(): CanvasRenderingContext2D {
    return this._context
  }

  public get sprite(): THREE.Sprite {
    return this._sprite
  }

  public set needsUpdate(value: boolean) {
    this._texture.needsUpdate = value
  }

  public clear(): void {
    this._context.clearRect(0, 0, this._canvas.width, this._canvas.height)
    this.needsUpdate = true
  }
}
