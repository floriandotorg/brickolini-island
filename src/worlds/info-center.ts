import * as THREE from 'three'
import { wgs023nu_RunAnim } from '../actions/garage'
import { hho006cl_RunAnim } from '../actions/hospital'
import { Background_Bitmap, iic027in_RunAnim } from '../actions/infomain'
import { playAnimation } from '../lib/animation'
import { getWorld } from '../lib/assets/model'
import { createTexture } from '../lib/assets/texture'
import { Plants } from '../lib/world/plants'
import { World } from '../lib/world/world'

export class InfoCenter extends World {
  private _backgroundScene = new THREE.Scene()
  private _backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private _backgroundMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2))

  public override async init(): Promise<void> {
    const world = await getWorld('HOSP')
    this._scene.add(world)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
    this._scene.add(ambientLight)

    const leftPointLight = new THREE.PointLight(0xffffff, 140)
    leftPointLight.position.set(7, 4, 4.5)
    this._scene.add(leftPointLight)

    const rightPointLight = new THREE.PointLight(0xffffff, 140)
    rightPointLight.position.set(-4, 4, 4.5)
    this._scene.add(rightPointLight)

    const centerPointLight = new THREE.PointLight(0xffffff, 80, 0, 5)
    centerPointLight.position.set(1.5, -4, 1)
    this._scene.add(centerPointLight)

    const frontPointLight = new THREE.PointLight(0xffffff, 100)
    frontPointLight.position.set(1.5, 0.75, -12)
    this._scene.add(frontPointLight)

    this._scene.add(await Plants.place(this, Plants.World.IMAIN))

    this._backgroundMesh.material = new THREE.MeshBasicMaterial({ map: createTexture(Background_Bitmap) })
    this._backgroundScene.add(this._backgroundMesh)

    await playAnimation(this, hho006cl_RunAnim)
    // await playAnimation(this, hho006cl_RunAnim)
  }

  public override render(renderer: THREE.WebGLRenderer): void {
    renderer.render(this._backgroundScene, this._backgroundCamera)
    renderer.clearDepth()
    super.render(renderer)
  }
}
