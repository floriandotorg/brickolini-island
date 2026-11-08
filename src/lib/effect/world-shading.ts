import * as THREE from 'three'
import { getSettings } from '../settings.ts'
import { createGradingLut } from './colour-grading.ts'
import { Effect } from './effect.ts'
import worldShadingFrag from './shader/world-shading.glsl'

export class WorldShadingEffect extends Effect {
  private readonly _sunDirection = new THREE.Vector3(0, 1, 0)
  private readonly _contact = { value: false }
  private readonly _grading = ['dawn', 'noon', 'dusk'].map(mood => {
    if (mood !== 'dawn' && mood !== 'noon' && mood !== 'dusk') {
      throw new Error('Invalid grading mood')
    }
    return createGradingLut(mood)
  })
  private readonly _dayPhase = { value: 0.5 }

  public dispose(): void {
    for (const texture of this._grading) {
      texture.dispose()
    }
  }

  public updateSun(scene: THREE.Scene): void {
    this._dayPhase.value = typeof scene.userData.dayPhase === 'number' ? scene.userData.dayPhase : 0.5
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
      tDawnLut: { value: this._grading[0] },
      tNoonLut: { value: this._grading[1] },
      tDuskLut: { value: this._grading[2] },
      uDayPhase: this._dayPhase,
      uContactDirection: { value: this._sunDirection },
      uContactShadows: this._contact,
      uPlasticEdges: { value: getSettings().graphics.postProcessing },
      uAmbientOcclusion: { value: this._ambientOcclusion },
      uFilmic: { value: this._toneMapping },
      toneMappingExposure: { value: 1 },
    }
  }
}
