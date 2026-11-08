import * as THREE from 'three'
import { getSettings } from '../settings.ts'
import { Effect } from './effect.ts'
import worldShadingFrag from './shader/world-shading.glsl'

export class WorldShadingEffect extends Effect {
  private readonly _sunDirection = new THREE.Vector3(0, 1, 0)
  private readonly _contact = { value: false }

  public updateSun(scene: THREE.Scene): void {
    const sun = scene.children.find(object => object instanceof THREE.DirectionalLight && object.intensity > 0)
    this._contact.value = getSettings().graphics.shadows && getSettings().graphics.postProcessing && sun instanceof THREE.DirectionalLight
    if (sun instanceof THREE.DirectionalLight) {
      this._sunDirection.subVectors(sun.position, sun.target.position).normalize().transformDirection(this._camera.matrixWorldInverse)
    }
  }

  public constructor(
    private readonly _camera: THREE.PerspectiveCamera,
    private readonly _depth: THREE.DepthTexture,
    private readonly _ambientOcclusion: boolean,
    private readonly _toneMapping: boolean,
  ) {
    super()
  }

  public get fragmentShader(): string {
    return worldShadingFrag
  }

  public override get uniforms(): Record<string, THREE.IUniform> {
    return {
      tWorldDepth: { value: this._depth },
      uProjectionInverse: { value: this._camera.projectionMatrixInverse },
      uProjection: { value: this._camera.projectionMatrix },
      uContactDirection: { value: this._sunDirection },
      uContactShadows: this._contact,
      uPlasticEdges: { value: getSettings().graphics.postProcessing },
      uAmbientOcclusion: { value: this._ambientOcclusion },
      uFilmic: { value: this._toneMapping },
      toneMappingExposure: { value: 1 },
    }
  }
}
