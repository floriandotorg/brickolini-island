import * as THREE from 'three'
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js'
import { Effect } from './effect.ts'

const levels = 5
const vertexShader = 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }'

const prefilterShader = `
uniform sampler2D source;
uniform sampler2D depth;
uniform float threshold;
uniform float knee;
uniform vec2 size;
out vec4 outColor;
vec3 tap(vec2 uv) {
  vec3 color = texture(source, uv).rgb;
  color = any(isnan(color)) || any(isinf(color)) ? vec3(0.0) : clamp(color, 0.0, 64.0);
  color *= 1.0 - step(0.999999, texture(depth, uv).r);
  float brightness = max(color.r, max(color.g, color.b));
  float soft = clamp(brightness - threshold + knee, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee + 0.0001);
  return color * max(soft, brightness - threshold) / max(brightness, 0.0001) / (1.0 + brightness * 0.25);
}
void main() {
  vec2 uv = gl_FragCoord.xy / size;
  vec2 texel = 1.0 / vec2(textureSize(source, 0));
  vec3 color = tap(uv + vec2(-texel.x, -texel.y)) + tap(uv + vec2(texel.x, -texel.y)) + tap(uv + vec2(-texel.x, texel.y)) + tap(uv + vec2(texel.x, texel.y));
  outColor = vec4(color * 0.25, 1.0);
}`

const downsampleShader = `
uniform sampler2D source;
uniform vec2 size;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / size;
  vec2 texel = 0.5 / size;
  vec3 color = texture(source, uv).rgb * 4.0;
  color += texture(source, uv - texel).rgb;
  color += texture(source, uv + texel).rgb;
  color += texture(source, uv + vec2(texel.x, -texel.y)).rgb;
  color += texture(source, uv - vec2(texel.x, -texel.y)).rgb;
  outColor = vec4(color / 8.0, 1.0);
}`

const upsampleShader = `
uniform sampler2D source;
uniform vec2 size;
uniform float weight;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / size;
  vec2 texel = 1.0 / vec2(textureSize(source, 0));
  vec3 color = texture(source, uv + vec2(-texel.x * 2.0, 0.0)).rgb;
  color += texture(source, uv + vec2(-texel.x, texel.y)).rgb * 2.0;
  color += texture(source, uv + vec2(0.0, texel.y * 2.0)).rgb;
  color += texture(source, uv + vec2(texel.x, texel.y)).rgb * 2.0;
  color += texture(source, uv + vec2(texel.x * 2.0, 0.0)).rgb;
  color += texture(source, uv + vec2(texel.x, -texel.y)).rgb * 2.0;
  color += texture(source, uv + vec2(0.0, -texel.y * 2.0)).rgb;
  color += texture(source, uv + vec2(-texel.x, -texel.y)).rgb * 2.0;
  outColor = vec4(color / 12.0 * weight, 1.0);
}`

const compositeShader = `
uniform sampler2D tBloom;
uniform float uBloomStrength;
void mainImage(const in vec4 inputColor, out vec4 outputColor) {
  outputColor = vec4(inputColor.rgb + texture(tBloom, uv).rgb * uBloomStrength, inputColor.a);
}`

const createPass = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>, blending: THREE.Blending = THREE.NoBlending) => new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader, fragmentShader, uniforms, blending, depthTest: false, depthWrite: false, transparent: blending !== THREE.NoBlending })

export class Bloom {
  private readonly _targets = Array.from({ length: levels }, () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false }))
  private readonly _quad = new FullScreenQuad()
  private readonly _prefilter: THREE.ShaderMaterial
  private readonly _downsample = createPass(downsampleShader, { source: { value: null }, size: { value: new THREE.Vector2() } })
  private readonly _upsample = createPass(upsampleShader, { source: { value: null }, size: { value: new THREE.Vector2() }, weight: { value: 1 } }, THREE.AdditiveBlending)

  public constructor(depth: THREE.DepthTexture) {
    this._prefilter = createPass(prefilterShader, { source: { value: null }, depth: { value: depth }, threshold: { value: 1.8 }, knee: { value: 0.9 }, size: { value: new THREE.Vector2() } })
  }

  public get texture(): THREE.Texture {
    return this._targets[0].texture
  }

  public setSize(width: number, height: number): void {
    for (let n = 0; n < levels; ++n) {
      this._targets[n].setSize(Math.max(1, Math.ceil(width / 2 ** (n + 1))), Math.max(1, Math.ceil(height / 2 ** (n + 1))))
    }
  }

  public render(renderer: THREE.WebGLRenderer, source: THREE.Texture): void {
    const target = renderer.getRenderTarget()
    const autoClear = renderer.autoClear
    renderer.autoClear = false
    try {
      this._draw(renderer, this._prefilter, source, this._targets[0])
      for (let n = 1; n < levels; ++n) {
        this._draw(renderer, this._downsample, this._targets[n - 1].texture, this._targets[n])
      }
      for (let n = levels - 1; n > 0; --n) {
        this._upsample.uniforms.weight.value = n === levels - 1 ? 1 : 0.85
        this._draw(renderer, this._upsample, this._targets[n].texture, this._targets[n - 1])
      }
    } finally {
      renderer.autoClear = autoClear
      renderer.setRenderTarget(target)
    }
  }

  private _draw(renderer: THREE.WebGLRenderer, material: THREE.ShaderMaterial, source: THREE.Texture, target: THREE.WebGLRenderTarget): void {
    material.uniforms.source.value = source
    material.uniforms.size.value.set(target.width, target.height)
    renderer.setRenderTarget(target)
    this._quad.material = material
    this._quad.render(renderer)
  }

  public dispose(): void {
    for (const target of this._targets) {
      target.dispose()
    }
    this._quad.dispose()
    this._prefilter.dispose()
    this._downsample.dispose()
    this._upsample.dispose()
  }
}

export class BloomEffect extends Effect {
  public constructor(private readonly _bloom: Bloom) {
    super()
  }

  public get fragmentShader(): string {
    return compositeShader
  }

  public override get uniforms(): Record<string, THREE.IUniform> {
    return { tBloom: { value: this._bloom.texture }, uBloomStrength: { value: 0.35 } }
  }
}
