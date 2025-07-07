import * as THREE from 'three'
import type { AnimationAction, ImageAction } from '../action-types'
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
    const { world, configAnimation, background } = this.getBuildingConfig()

    this._scene.add(await getWorld(world))
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
    this._scene.add(ambientLight)

    this._backgroundMesh.material = new THREE.MeshBasicMaterial({ map: createTexture(background) })
    this._backgroundScene.add(this._backgroundMesh)

    const animation = parse3DAnimation(await getAction(configAnimation))
    this.setupCameraForAnimation(animation.tree)
  }

  public override render(renderer: THREE.WebGLRenderer): void {
    renderer.render(this._backgroundScene, this._backgroundCamera)
    renderer.clearDepth()
    super.render(renderer)
  }

  protected abstract getBuildingConfig(): {
    world: Parameters<typeof getWorld>[0]
    configAnimation: AnimationAction
    background: ImageAction
  }
}
