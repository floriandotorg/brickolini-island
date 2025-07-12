import * as THREE from 'three'
import { type ActorAction, type AnimationAction, type ControlAction, type EntityAction, getExtraValue, type ImageAction, isAnimationAction, isControlAction, isImageAction, type ParallelAction, type SerialAction } from '../action-types'
import { parse3DAnimation } from '../assets/animation'
import { Control } from '../assets/control'
import { getAction } from '../assets/load'
import { getWorld } from '../assets/model'
import { createTexture } from '../assets/texture'
import { World } from './world'

export abstract class Building extends World {
  private _backgroundScene = new THREE.Scene()
  private _backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private _backgroundMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2))
  private _controls: Control[] = []

  public override async init(): Promise<void> {
    await super.init()

    const { startUpAction } = this.getBuildingConfig()

    const worldName = getExtraValue(startUpAction, 'World')?.trim()
    if (worldName == null) {
      throw new Error('World not found in startUpAction')
    }

    this._scene.add(await getWorld(worldName as Parameters<typeof getWorld>[0]))
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
    this._scene.add(ambientLight)

    for (const child of startUpAction.children) {
      if (isImageAction(child) && child.name === 'Background_Bitmap') {
        this._backgroundMesh.material = new THREE.MeshBasicMaterial({ map: createTexture(child) })
        this._backgroundScene.add(this._backgroundMesh)
      }

      if (isAnimationAction(child) && child.name === 'ConfigAnimation') {
        const animation = parse3DAnimation(await getAction(child))
        this.setupCameraForAnimation(animation.tree)
      }

      if (isControlAction(child)) {
        this._controls.push(await Control.create(child))
      }
    }
  }

  public override render(renderer: THREE.WebGLRenderer): void {
    renderer.render(this._backgroundScene, this._backgroundCamera)
    renderer.clearDepth()
    super.render(renderer)
  }

  public override pointerDown(_event: MouseEvent, normalizedX: number, normalizedY: number): void {
    for (const control of this._controls) {
      control.pointerDown(normalizedX, normalizedY)
    }
  }

  protected abstract getBuildingConfig(): {
    startUpAction: ParallelAction<ActorAction | EntityAction | ImageAction | AnimationAction | ControlAction, 'LegoWorldPresenter'> | SerialAction<ActorAction | EntityAction | ImageAction | AnimationAction | ControlAction, 'LegoWorldPresenter'>
  }
}
