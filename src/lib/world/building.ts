import * as THREE from 'three'
import { type ActorAction, type AnimationAction, type ControlAction, type EntityAction, type ImageAction, isAnimationAction, isImageAction, type ParallelAction, type SerialAction } from '../action-types'
import { parse3DAnimation } from '../assets/animation'
import { getAction } from '../assets/load'
import { getWorld } from '../assets/model'
import { createTexture } from '../assets/texture'
import { World } from './world'

export abstract class Building extends World {
  private _backgroundScene = new THREE.Scene()
  private _backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private _backgroundMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2))

  public override async init(): Promise<void> {
    await super.init()

    const { startUpAction } = this.getBuildingConfig()

    const match = startUpAction.extra?.match(/World:([^,]*)/)
    if (match?.[1] == null) {
      throw new Error('World not found in startUpAction')
    }

    this._scene.add(await getWorld(match[1].trim() as Parameters<typeof getWorld>[0]))
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
    }
  }

  public override render(renderer: THREE.WebGLRenderer): void {
    renderer.render(this._backgroundScene, this._backgroundCamera)
    renderer.clearDepth()
    super.render(renderer)
  }

  protected abstract getBuildingConfig(): {
    startUpAction: ParallelAction<ActorAction | EntityAction | ImageAction | AnimationAction | ControlAction, 'LegoWorldPresenter'> | SerialAction<ActorAction | EntityAction | ImageAction | AnimationAction | ControlAction, 'LegoWorldPresenter'>
  }
}
