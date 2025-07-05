import * as THREE from 'three'
import type { ImageAction } from '../action-types'
import { getWorld } from '../assets/model'
import { createTexture } from '../assets/texture'
import { World } from './world'

export class Building extends World {
  private _backgroundScene = new THREE.Scene()
  private _backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private _backgroundMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2))

  protected async loadWorld(name: Parameters<typeof getWorld>[0], background: ImageAction): Promise<void> {
    const world = await getWorld(name)
    this._scene.add(world)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
    this._scene.add(ambientLight)

    this._backgroundMesh.material = new THREE.MeshBasicMaterial({ map: createTexture(background) })
    this._backgroundScene.add(this._backgroundMesh)
  }

  public override render(renderer: THREE.WebGLRenderer): void {
    renderer.render(this._backgroundScene, this._backgroundCamera)
    renderer.clearDepth()
    super.render(renderer)
  }
}
