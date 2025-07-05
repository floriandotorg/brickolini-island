import * as THREE from 'three'
import { Background_Bitmap, ConfigAnimation } from '../actions/infomain'
import { getAction, getWorld } from '../lib/assets'
import { parse3DAnimation } from '../lib/assets/animation'
import { createTexture } from '../lib/assets/texture'
import { Plants } from '../lib/world/plants'
import { World } from '../lib/world/world'

export class InfoCenter extends World {
  private _backgroundScene = new THREE.Scene()
  private _backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private _backgroundMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2))

  public override async init(): Promise<void> {
    const world = await getWorld('IMAIN')
    this._scene.add(world)

    const configAnimation = parse3DAnimation(await getAction(ConfigAnimation))

    const cameraConfig = configAnimation.children.find(c => c.name.startsWith('cam'))
    if (cameraConfig == null) {
      throw new Error('Camera config not found')
    }

    const match = cameraConfig.name.match(/^cam(\d{2})$/)
    if (match?.[1] == null) {
      throw new Error('Camera fov not found')
    }
    this.setVerticalFOV(Number.parseInt(match[1]))

    const cameraPosition = cameraConfig.translationKeys[0]?.vertex
    if (cameraPosition == null) {
      throw new Error('Camera position not found')
    }
    this._camera.position.copy(cameraPosition)

    const lookAtPosition = configAnimation.children.find(c => c.name === 'target')?.translationKeys[0]?.vertex
    if (lookAtPosition == null) {
      throw new Error('Look at position not found')
    }
    this._camera.lookAt(lookAtPosition)

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
