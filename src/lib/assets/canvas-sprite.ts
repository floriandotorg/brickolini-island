import * as THREE from 'three'

export class CanvasSprite {
  private readonly _canvas: HTMLCanvasElement
  private readonly _context: CanvasRenderingContext2D
  private readonly _texture: THREE.CanvasTexture
  private readonly _sprite: THREE.Sprite

  public constructor(x: number, y: number, w: number, h: number, canvasWidth: number, canvasHeight: number) {
    const normalizedX = (x / canvasWidth) * 2 - 1
    const normalizedY = -((y / canvasHeight) * 2 - 1)
    const normalizedWidth = (w / canvasWidth) * 2
    const normalizedHeight = (h / canvasHeight) * 2

    this._canvas = document.createElement('canvas')
    this._canvas.width = w
    this._canvas.height = h
    const context = this._canvas.getContext('2d')
    if (context == null) {
      throw new Error('HUD canvas context not found')
    }
    this._context = context
    this._texture = new THREE.CanvasTexture(this._canvas)
    this._texture.colorSpace = THREE.SRGBColorSpace
    const material = new THREE.SpriteMaterial({ map: this._texture, transparent: true })
    this._sprite = new THREE.Sprite(material)
    this._sprite.scale.set(normalizedWidth, normalizedHeight, 1)
    this._sprite.position.set(normalizedX + normalizedWidth / 2, normalizedY - normalizedHeight / 2, 0)
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
