import * as THREE from 'three'
import { Render } from '../effect/composer.ts'
import { getEnvironmentGenerator } from '../effect/environment.ts'
import { WorldShadingEffect } from '../effect/world-shading.ts'
import { getSettings } from '../settings.ts'
import type { VehicleType } from '../vehicle-types.ts'
import { configureInteriorCamera, VehicleInterior } from './vehicle-interior.ts'

const createSkyEnvironment = (renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget => {
  const scene = new THREE.Scene()
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: 'varying vec3 vDirection; void main() { vDirection = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vDirection;
void main() {
  vec3 ground = vec3(0.16, 0.15, 0.12);
  vec3 horizon = vec3(1.1, 1.08, 1.0);
  vec3 zenith = vec3(0.35, 0.55, 0.95);
  float height = vDirection.y;
  vec3 color = height < 0.0 ? mix(horizon * 0.5, ground, smoothstep(0.0, 0.25, -height)) : mix(horizon, zenith, smoothstep(0.0, 0.6, height));
  gl_FragColor = vec4(color, 1.0);
}`,
    }),
  )
  scene.add(sky)
  const target = getEnvironmentGenerator(renderer).fromScene(scene, 0.02)
  sky.geometry.dispose()
  sky.material.dispose()
  return target
}

export class InteriorRender extends Render {
  public readonly scene = new THREE.Scene()
  public readonly camera = new THREE.PerspectiveCamera(50, 4 / 3, 0.01, 10)
  public readonly interior = new VehicleInterior()
  private readonly _depth = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType)
  private readonly _target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthTexture: this._depth, stencilBuffer: false, samples: 4 })
  private readonly _sun = new THREE.DirectionalLight(0xfff4df, 2.4)
  private readonly _fill = new THREE.HemisphereLight(0xcddfff, 0x716052, 0.4)
  private readonly _inverseView = new THREE.Quaternion()
  private readonly _lightDirection = new THREE.Vector3()
  private readonly _clearColor = new THREE.Color()
  private readonly _shading = new WorldShadingEffect(this.camera, this._depth, false, getSettings().graphics.toneMapping === 'filmic')
  private _skyEnvironment: THREE.WebGLRenderTarget | null = null
  private _worldScene: THREE.Scene | null = null
  private _worldCamera: THREE.PerspectiveCamera | null = null

  public constructor() {
    super()
    this._sun.target.position.set(0, -0.4, -1.4)
    this._sun.position.set(-3, 4, 1)
    this._sun.castShadow = true
    this._sun.shadow.mapSize.set(1024, 1024)
    this._sun.shadow.camera.left = -1.8
    this._sun.shadow.camera.right = 1.8
    this._sun.shadow.camera.top = 1.8
    this._sun.shadow.camera.bottom = -1.8
    this._sun.shadow.camera.near = 0.1
    this._sun.shadow.camera.far = 12
    this._sun.shadow.bias = -0.0001
    this._sun.shadow.normalBias = 0.002
    this.scene.add(this.camera, this._sun, this._sun.target, this._fill)
    this.addEffect(this._shading)
  }

  public setWorld(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    this._worldScene = scene
    this._worldCamera = camera
  }

  public async show(type: VehicleType, enabled: boolean): Promise<boolean> {
    const shown = await this.interior.show(type, enabled)
    const model = this.interior.model
    if (shown && model != null) {
      this.scene.add(model)
    }
    return shown
  }

  public override get empty(): boolean {
    return this.interior.model == null
  }

  public get texture(): THREE.Texture {
    return this._target.texture
  }

  public resize(width: number, height: number): void {
    this._target.setSize(width, height)
    configureInteriorCamera(this.camera, width, height)
  }

  public render(renderer: THREE.WebGLRenderer): void {
    this._worldCamera?.getWorldQuaternion(this._inverseView).invert()
    const source = this._worldScene?.children.find(object => object instanceof THREE.DirectionalLight && object.intensity > 0)
    if (source instanceof THREE.DirectionalLight) {
      this._lightDirection.subVectors(source.position, source.target.position).normalize().applyQuaternion(this._inverseView)
      this._sun.position.copy(this._sun.target.position).addScaledVector(this._lightDirection, 5)
      this._sun.color.copy(source.color)
      this._sun.intensity = Math.max(0.35, source.intensity * 1.25)
    }
    this.scene.userData.dayPhase = this._worldScene?.userData.dayPhase ?? 0.5
    const worldEnvironment = this._worldScene?.environment ?? null
    if (worldEnvironment == null && this._skyEnvironment == null) {
      this._skyEnvironment = createSkyEnvironment(renderer)
    }
    this.scene.environment = worldEnvironment ?? this._skyEnvironment?.texture ?? null
    this.scene.environmentIntensity = worldEnvironment == null ? 0.5 : Math.max(0.3, (this._worldScene?.environmentIntensity ?? 0.4) * 1.1)
    this.scene.environmentRotation.setFromQuaternion(this._inverseView)
    const target = renderer.getRenderTarget()
    const shadows = renderer.shadowMap.enabled
    const autoUpdate = renderer.shadowMap.autoUpdate
    const clipping = renderer.localClippingEnabled
    const alpha = renderer.getClearAlpha()
    renderer.getClearColor(this._clearColor)
    try {
      renderer.shadowMap.enabled = true
      renderer.shadowMap.autoUpdate = true
      renderer.localClippingEnabled = true
      renderer.setClearColor(0x000000, 0)
      renderer.setRenderTarget(this._target)
      renderer.render(this.scene, this.camera)
      this._shading.updateSun(this.scene)
    } finally {
      renderer.setRenderTarget(target)
      renderer.setClearColor(this._clearColor, alpha)
      renderer.shadowMap.enabled = shadows
      renderer.shadowMap.autoUpdate = autoUpdate
      renderer.localClippingEnabled = clipping
    }
  }

  public override dispose(): void {
    this.interior.clear()
    this._sun.shadow.dispose()
    this._skyEnvironment?.dispose()
    this._target.dispose()
    this._depth.dispose()
    this._shading.dispose()
    super.dispose()
  }
}
