import * as THREE from 'three'
import { Background_Bitmap } from '../actions/infomain'
import { getWorld } from '../lib/assets'
import { createTexture } from '../lib/assets/texture'
import { Plants } from '../lib/world/plants'
import { World } from '../lib/world/world'

export class InfoCenter extends World {
  private _backgroundScene = new THREE.Scene()
  private _backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private _backgroundMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2))

  public override async init(): Promise<void> {
    const world = await getWorld('IMAIN')
    // this._scene.add(world)

    this._camera.position.set(0, 0, -10)
    this._camera.lookAt(new THREE.Vector3(-1.280536, -2.18024, -1.57823))

    const ambientLight = new THREE.AmbientLight(0xffffff, 1)
    this._scene.add(ambientLight)

    this._scene.add(await Plants.place(this, Plants.World.IMAIN))

    this._backgroundMesh.material = new THREE.MeshBasicMaterial({ map: createTexture(Background_Bitmap) })
    this._backgroundScene.add(this._backgroundMesh)
  }

  public override render(renderer: THREE.WebGLRenderer): void {
    renderer.render(this._backgroundScene, this._backgroundCamera)
    renderer.clearDepth()
    super.render(renderer)
  }
}
