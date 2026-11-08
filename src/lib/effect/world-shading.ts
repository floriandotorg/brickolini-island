import type * as THREE from 'three'
import { createAmbientOcclusionSamples } from '../graphics.ts'
import { Effect } from './effect.ts'
import worldShadingFrag from './shader/world-shading.glsl'

export class WorldShadingEffect extends Effect {
  private readonly _samples = createAmbientOcclusionSamples()
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
      uAmbientSamples: { value: this._samples },
      tWorldDepth: { value: this._depth },
      uProjectionInverse: { value: this._camera.projectionMatrixInverse },
      uProjection: { value: this._camera.projectionMatrix },
      uAmbientOcclusion: { value: this._ambientOcclusion },
      uFilmic: { value: this._toneMapping },
      toneMappingExposure: { value: 1 },
    }
  }
}
