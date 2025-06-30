import * as THREE from 'three'
import { RESOLUTION_RATIO } from '../engine'

export abstract class World {
  protected _scene = new THREE.Scene()
  protected _camera = new THREE.PerspectiveCamera(75, RESOLUTION_RATIO, 0.1, 1000)

  private _debugGroup: THREE.Group = new THREE.Group()
  private _debugBox: HTMLElement
  private _debugPosition: HTMLElement
  private _debugDirection: HTMLElement
  private _debugSlewMode: HTMLElement

  private _raycaster = new THREE.Raycaster()
  private _clickListeners = new Map<THREE.Object3D, (event: MouseEvent) => void>()

  public currentActor: 'pepper' | 'nick' = 'nick'

  constructor() {
    this._camera.rotation.order = 'YXZ'

    const getElement = (id: string): HTMLElement => {
      const element = document.getElementById(id)
      if (element == null) {
        throw new Error(`Element ${id} not found`)
      }
      return element
    }

    this._debugBox = getElement('debug')
    this._debugPosition = getElement('debug-position')
    this._debugDirection = getElement('debug-direction')
    this._debugSlewMode = getElement('debug-slew-mode')

    this.debugMode = false

    this._scene.add(this._debugGroup)
  }

  public get scene(): THREE.Scene {
    return this._scene
  }

  public addClickListener(objects: THREE.Object3D, onClick: (event: MouseEvent) => void): void {
    this._clickListeners.set(objects, onClick)
  }

  public click(event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), this._camera)
    let hit: THREE.Object3D | null = this._raycaster.intersectObjects(Array.from(this._clickListeners.keys()))[0]?.object
    while (hit != null) {
      const onClick = this._clickListeners.get(hit)
      if (hit.visible && onClick != null) {
        onClick(event)
        break
      }
      hit = hit.parent
    }
  }

  public pointerDown(_event: MouseEvent, _normalizedX: number, _normalizedY: number): void {}
  public pointerUp(_event: MouseEvent): void {}

  public get debugMode(): boolean {
    return this._debugGroup.visible
  }

  protected set debugMode(value: boolean) {
    this._debugGroup.visible = value
    this._debugBox.classList.toggle('hidden', !value)
  }

  protected setDebugData(position: THREE.Vector3, direction: THREE.Vector3, slewMode: boolean): void {
    this._debugPosition.textContent = `x: ${position.x.toFixed(4)}, y: ${position.y.toFixed(4)}, z: ${position.z.toFixed(4)}`
    this._debugDirection.textContent = `x: ${direction.x.toFixed(4)}, y: ${direction.y.toFixed(4)}, z: ${direction.z.toFixed(4)}`
    this._debugSlewMode.classList.toggle('hidden', !slewMode)
  }

  abstract init(): Promise<void>
  abstract update(delta: number): Promise<void>

  public resize(_width: number, _height: number): void {}

  public render(renderer: THREE.WebGLRenderer): void {
    renderer.render(this._scene, this._camera)
  }

  public keyPressed(key: string): void {
    if (key === 'd' && import.meta.env.DEV) {
      this.debugMode = !this.debugMode
    }
  }

  public debugDrawArrow(from: THREE.Vector3, to: THREE.Vector3, color: string): THREE.ArrowHelper {
    const dir = to.clone().sub(from).normalize()
    const length = from.distanceTo(to)
    const arrow = new THREE.ArrowHelper(dir, from, length, color)
    this._debugGroup.add(arrow)
    return arrow
  }

  public debugDrawSphere(position: THREE.Vector3, color: string, radius = 1): THREE.Mesh {
    const sphere = new THREE.SphereGeometry(radius)
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
    const mesh = new THREE.Mesh(sphere, material)
    mesh.position.copy(position)
    this._debugGroup.add(mesh)
    return mesh
  }

  public debugDrawPlane(anchor: THREE.Vector3, normal: THREE.Vector3, color: string): THREE.Mesh {
    const planeGeometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
    const mesh = new THREE.Mesh(planeGeometry, material)
    mesh.position.copy(anchor)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
    this._debugGroup.add(mesh)
    return mesh
  }

  public debugDrawDebugMesh(mesh: THREE.Mesh): void {
    mesh.material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    this._debugGroup.add(mesh)
  }

  public debugDrawText(position: THREE.Vector3, text: string, color: string): THREE.Sprite {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff }))
    sprite.position.copy(position)
    sprite.scale.set(2, 1, 1)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx == null) {
      throw new Error('Context not found')
    }
    ctx.font = '20px sans-serif'
    const metrics = ctx.measureText(text)
    canvas.width = Math.ceil(metrics.width) + 16
    canvas.height = 32
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 32, 16)
    const texture = new THREE.CanvasTexture(canvas)
    sprite.material.map = texture
    sprite.material.needsUpdate = true
    this._debugGroup.add(sprite)
    return sprite
  }
}
