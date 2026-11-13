import * as THREE from 'three'
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js'
import { getSettings } from '../settings.ts'
import { createGradingLut } from './colour-grading.ts'
import { Effect } from './effect.ts'
import screenSpaceBlurFrag from './shader/screen-space-blur.glsl'
import screenSpaceShadingFrag from './shader/screen-space-shading.glsl'
import worldShadingFrag from './shader/world-shading.glsl'

const fullScreenVertex = 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }'

const createTarget = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false })

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
  private readonly _raw = createTarget()
  private readonly _blurred = createTarget()
  private readonly _size = new THREE.Vector2(1, 1)
  private readonly _active = { value: false }
  private readonly _shadingMaterial: THREE.ShaderMaterial
  private readonly _blurMaterial: THREE.ShaderMaterial
  private readonly _quad = new FullScreenQuad()

  public constructor(
    private readonly _camera: THREE.PerspectiveCamera,
    private readonly _depth: THREE.DepthTexture,
    private readonly _ambientOcclusion: boolean,
    private readonly _toneMapping: boolean,
  ) {
    super()
    this._shadingMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: fullScreenVertex,
      fragmentShader: screenSpaceShadingFrag,
      uniforms: {
        tDepth: { value: _depth },
        uProjection: { value: _camera.projectionMatrix },
        uProjectionInverse: { value: _camera.projectionMatrixInverse },
        uContactDirection: { value: this._sunDirection },
        uAmbientOcclusion: { value: _ambientOcclusion },
        uContactShadows: this._contact,
        uSize: { value: this._size },
      },
      depthTest: false,
      depthWrite: false,
    })
    this._blurMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: fullScreenVertex,
      fragmentShader: screenSpaceBlurFrag,
      uniforms: { tShading: { value: this._raw.texture } },
      depthTest: false,
      depthWrite: false,
    })
  }

  public resize(width: number, height: number): void {
    this._size.set(Math.max(1, Math.ceil(width / 2)), Math.max(1, Math.ceil(height / 2)))
    this._raw.setSize(this._size.x, this._size.y)
    this._blurred.setSize(this._size.x, this._size.y)
  }

  public dispose(): void {
    for (const texture of this._grading) {
      texture.dispose()
    }
    this._raw.dispose()
    this._blurred.dispose()
    this._shadingMaterial.dispose()
    this._blurMaterial.dispose()
    this._quad.dispose()
  }

  public updateSun(scene: THREE.Scene): void {
    this._dayPhase.value = typeof scene.userData.dayPhase === 'number' ? scene.userData.dayPhase : 0.5
    const sun = scene.children.find(object => object instanceof THREE.DirectionalLight && object.intensity > 0)
    this._contact.value = getSettings().graphics.shadows && getSettings().graphics.postProcessing && sun instanceof THREE.DirectionalLight
    if (sun instanceof THREE.DirectionalLight) {
      this._sunDirection.subVectors(sun.position, sun.target.position).normalize().transformDirection(this._camera.matrixWorldInverse)
    }
  }

  public renderScreenSpace(renderer: THREE.WebGLRenderer): void {
    this._active.value = this._ambientOcclusion || this._contact.value
    if (!this._active.value) {
      return
    }
    const target = renderer.getRenderTarget()
    renderer.setRenderTarget(this._raw)
    this._quad.material = this._shadingMaterial
    this._quad.render(renderer)
    renderer.setRenderTarget(this._blurred)
    this._quad.material = this._blurMaterial
    this._quad.render(renderer)
    renderer.setRenderTarget(target)
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
      tScreenShading: { value: this._blurred.texture },
      uScreenShading: this._active,
      uPlasticEdges: { value: getSettings().graphics.postProcessing },
      uFilmic: { value: this._toneMapping },
      toneMappingExposure: { value: 1 },
    }
  }
}
