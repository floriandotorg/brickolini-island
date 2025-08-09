import * as THREE from 'three'
import { ORIGINAL_TOTAL_HEIGHT, ORIGINAL_TOTAL_WIDTH } from '../engine'

export const createNormalizedSprite = (x: number, y: number, z: number, originalActionWidth: number, originalActionHeight: number): THREE.Sprite => {
  const normalizedX = (x / ORIGINAL_TOTAL_WIDTH) * 2 - 1
  const normalizedY = -((y / ORIGINAL_TOTAL_HEIGHT) * 2 - 1)
  const normalizedWidth = (originalActionWidth / ORIGINAL_TOTAL_WIDTH) * 2
  const normalizedHeight = (originalActionHeight / ORIGINAL_TOTAL_HEIGHT) * 2

  const sprite = new THREE.Sprite()
  sprite.scale.set(normalizedWidth, normalizedHeight, 1)
  sprite.position.set(normalizedX + normalizedWidth / 2, normalizedY - normalizedHeight / 2, z)
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
    this._sprite = createNormalizedSprite(x, y, 0.5, originalActionWidth, originalActionHeight)
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
