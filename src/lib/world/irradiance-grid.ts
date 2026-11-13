import * as THREE from 'three'
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js'
import { markSharedShaderHook } from '../effect/render-batches.ts'
import { captureProbe } from './probe-capture.ts'

const size = new THREE.Vector3(9, 4, 9)
const count = size.x * size.y * size.z
const coefficients = 9
const bounces = 2
const maximumCachedPhases = 48
const facesPerFrame = [
  [0, 1],
  [2, 3],
  [4, 5],
]
const fullScreenVertex = 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }'

const declarations = `
uniform sampler2D islandIrradiance;
uniform sampler2D islandVisibility;
uniform vec3 islandProbeMin;
uniform vec3 islandProbeSpan;
uniform float islandProbeReady;
vec3 islandGI(vec3 worldPosition, vec3 normal, vec3 fallback) {
  vec3 grid = clamp((worldPosition - islandProbeMin) / islandProbeSpan * vec3(8.0, 3.0, 8.0), vec3(0.0), vec3(7.999, 2.999, 7.999));
  vec3 base = floor(grid);
  vec3 fraction = fract(grid);
  vec3 result = vec3(0.0);
  float total = 0.0;
  for (int n = 0; n < 8; ++n) {
    vec3 corner = vec3(n & 1, (n >> 1) & 1, (n >> 2) & 1);
    vec3 cell = base + corner;
    int index = int(cell.x + cell.y * 9.0 + cell.z * 36.0);
    vec3 probe = islandProbeMin + cell / vec3(8.0, 3.0, 8.0) * islandProbeSpan;
    vec3 delta = worldPosition - probe;
    vec4 positiveDepth = texelFetch(islandVisibility, ivec2(index, 0), 0);
    vec3 negativeDepth = texelFetch(islandVisibility, ivec2(index, 1), 0).rgb;
    vec3 limit = mix(negativeDepth, positiveDepth.rgb, step(vec3(0.0), delta));
    float visibility = exp(-4.0 * max(max(abs(delta.x) - limit.x, abs(delta.y) - limit.y), max(abs(delta.z) - limit.z, 0.0)));
    vec3 blend = mix(1.0 - fraction, fraction, corner);
    float weight = blend.x * blend.y * blend.z * max(visibility, 0.0001) * positiveDepth.a;
    vec3 light = texelFetch(islandIrradiance, ivec2(index, 0), 0).rgb * 0.886227;
    light += texelFetch(islandIrradiance, ivec2(index, 1), 0).rgb * (1.023328 * normal.y);
    light += texelFetch(islandIrradiance, ivec2(index, 2), 0).rgb * (1.023328 * normal.z);
    light += texelFetch(islandIrradiance, ivec2(index, 3), 0).rgb * (1.023328 * normal.x);
    light += texelFetch(islandIrradiance, ivec2(index, 4), 0).rgb * (0.858086 * normal.x * normal.y);
    light += texelFetch(islandIrradiance, ivec2(index, 5), 0).rgb * (0.858086 * normal.y * normal.z);
    light += texelFetch(islandIrradiance, ivec2(index, 6), 0).rgb * (0.743125 * normal.z * normal.z - 0.247708);
    light += texelFetch(islandIrradiance, ivec2(index, 7), 0).rgb * (0.858086 * normal.x * normal.z);
    light += texelFetch(islandIrradiance, ivec2(index, 8), 0).rgb * (0.429043 * (normal.x * normal.x - normal.y * normal.y));
    result += max(light, vec3(0.0)) * weight;
    total += weight;
  }
  return total > 0.00001 ? result / total : fallback;
}`

const projectionShader = `
uniform samplerCube cube;
uniform float column;
out vec4 outColor;
float basis(int coefficient, vec3 direction) {
  if (coefficient == 0) return 0.282095;
  if (coefficient == 1) return 0.488603 * direction.y;
  if (coefficient == 2) return 0.488603 * direction.z;
  if (coefficient == 3) return 0.488603 * direction.x;
  if (coefficient == 4) return 1.092548 * direction.x * direction.y;
  if (coefficient == 5) return 1.092548 * direction.y * direction.z;
  if (coefficient == 6) return 0.315392 * (3.0 * direction.z * direction.z - 1.0);
  if (coefficient == 7) return 1.092548 * direction.x * direction.z;
  return 0.546274 * (direction.x * direction.x - direction.y * direction.y);
}
void main() {
  if (abs(gl_FragCoord.x - 0.5 - column) > 0.25) {
    discard;
  }
  int coefficient = int(gl_FragCoord.y);
  vec3 sum = vec3(0.0);
  float total = 0.0;
  for (int face = 0; face < 6; ++face) {
    for (int y = 0; y < 16; ++y) {
      for (int x = 0; x < 16; ++x) {
        vec2 plane = (vec2(x, y) + 0.5) / 8.0 - 1.0;
        vec3 direction = face == 0 ? vec3(1.0, plane.y, -plane.x) : face == 1 ? vec3(-1.0, plane.y, plane.x) : face == 2 ? vec3(plane.x, 1.0, -plane.y) : face == 3 ? vec3(plane.x, -1.0, plane.y) : face == 4 ? vec3(plane.x, plane.y, 1.0) : vec3(-plane.x, plane.y, -1.0);
        float weight = 1.0 / pow(dot(direction, direction), 1.5);
        direction = normalize(direction);
        sum += texture(cube, direction).rgb * basis(coefficient, direction) * weight;
        total += weight;
      }
    }
  }
  outColor = vec4(sum * (4.0 * 3.14159265 / total), 1.0);
}`

const blendShader = `
uniform sampler2D current;
uniform sampler2D target;
uniform float amount;
out vec4 outColor;
void main() {
  ivec2 pixel = ivec2(gl_FragCoord.xy);
  outColor = mix(texelFetch(current, pixel, 0), texelFetch(target, pixel, 0), amount);
}`

const createAtlas = () => new THREE.WebGLRenderTarget(count, coefficients, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false })

const createPass = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) => new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: fullScreenVertex, fragmentShader, uniforms, depthTest: false, depthWrite: false })

export class IrradianceGrid {
  private readonly _visibilityPixels = new Float32Array(count * 2 * 4)
  private readonly _visibility = new THREE.DataTexture(this._visibilityPixels, count, 2, THREE.RGBAFormat, THREE.FloatType)
  private readonly _measured = new Uint8Array(count)
  private readonly _pending = createAtlas()
  private _target = createAtlas()
  private _display = [createAtlas(), createAtlas()]
  private readonly _bounds = new THREE.Box3()
  private readonly _span = new THREE.Vector3()
  private readonly _ready = { value: 0 }
  private readonly _irradiance = { value: this._display[0].texture }
  private readonly _materials = new WeakSet<THREE.Material>()
  private readonly _cube = new THREE.WebGLCubeRenderTarget(32, { type: THREE.HalfFloatType })
  private readonly _camera = new THREE.CubeCamera(0.1, 600, this._cube)
  private readonly _ray = new THREE.Raycaster()
  private readonly _cache = new Map<number, THREE.WebGLRenderTarget>()
  private readonly _quad = new FullScreenQuad()
  private readonly _column = { value: 0 }
  private readonly _projection = createPass(projectionShader, { cube: { value: this._cube.texture }, column: this._column })
  private readonly _blendAmount = { value: 1 }
  private readonly _blend = createPass(blendShader, { current: { value: null }, target: { value: null }, amount: this._blendAmount })
  private _index = 0
  private _surfaces: THREE.Mesh[] = []
  private _face = 0
  private _bounce = 0
  private _sun = Number.NaN
  private _lit = false

  public constructor() {
    this._visibility.needsUpdate = true
  }

  public get progress(): number {
    return Math.min(1, (this._bounce * count + this._index) / (bounces * count))
  }

  public prepare(scene: THREE.Scene): void {
    if (this._bounds.isEmpty()) {
      this._measureBounds(scene)
    }
    if (!this._bounds.isEmpty() && this._bounce < bounces && this._measured[this._index] === 0) {
      this._measureVisibility(scene, this._index)
    }
  }

  public update(renderer: THREE.WebGLRenderer, scene: THREE.Scene, sun: number): void {
    if (this._bounds.isEmpty()) {
      return
    }
    const target = renderer.getRenderTarget()
    if (sun !== this._sun && (Number.isNaN(this._sun) || this._bounce >= bounces)) {
      this._sun = sun
      this._index = 0
      this._face = 0
      const cached = this._cache.get(sun)
      if (cached != null) {
        this._cache.delete(sun)
        this._cache.set(sun, cached)
        this._target = cached
        this._bounce = bounces
      } else {
        this._bounce = 0
        if ([...this._cache.values()].includes(this._target)) {
          const previous = this._target
          this._target = createAtlas()
          this._copy(renderer, previous, this._target)
        }
      }
    }
    const xr = renderer.xr.enabled
    renderer.xr.enabled = false
    try {
      if (this._bounce < bounces && this._measured[this._index] === 1) {
        this._capture(renderer, scene)
      }
      if (this._ready.value > 0) {
        this._blendDisplay(renderer)
      }
    } finally {
      renderer.xr.enabled = xr
      renderer.setRenderTarget(target)
    }
  }

  public dispose(): void {
    this._visibility.dispose()
    this._pending.dispose()
    for (const atlas of this._display) {
      atlas.dispose()
    }
    for (const atlas of this._cache.values()) {
      atlas.dispose()
    }
    if (![...this._cache.values()].includes(this._target)) {
      this._target.dispose()
    }
    this._cache.clear()
    this._cube.dispose()
    this._projection.dispose()
    this._blend.dispose()
    this._quad.dispose()
  }

  public hook(material: THREE.MeshStandardMaterial): void {
    if (this._materials.has(material)) {
      return
    }
    this._materials.add(material)
    const previous = material.onBeforeCompile
    const key = material.customProgramCacheKey()
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer)
      Object.assign(shader.uniforms, {
        islandIrradiance: this._irradiance,
        islandVisibility: { value: this._visibility },
        islandProbeMin: { value: this._bounds.min },
        islandProbeSpan: { value: this._span },
        islandProbeReady: this._ready,
      })
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${declarations}`).replace(
        '#include <lights_fragment_maps>',
        `#include <lights_fragment_maps>\nif (islandProbeReady > 0.0) {
          vec3 probeWorld = cameraPosition + transpose(mat3(viewMatrix)) * -vViewPosition;
          vec3 probeNormal = transformNormalByInverseViewMatrix(geometryNormal, viewMatrix);
          iblIrradiance = mix(iblIrradiance, islandGI(probeWorld + probeNormal * 0.15, probeNormal, iblIrradiance), islandProbeReady);
        }`,
      )
    }
    material.customProgramCacheKey = () => `${key}:island-grid-v2`
    material.needsUpdate = true
    markSharedShaderHook(material)
  }

  private _measureBounds(scene: THREE.Scene): void {
    if (!scene.getObjectsByProperty('isMesh', true).some(object => object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial)) {
      return
    }
    scene.updateMatrixWorld(true)
    scene.traverse(mesh => {
      if (mesh instanceof THREE.Mesh && mesh.geometry && mesh.material instanceof THREE.MeshStandardMaterial) {
        const box = new THREE.Box3().setFromObject(mesh)
        if (box.getSize(new THREE.Vector3()).length() < 1500) {
          this._bounds.union(box)
        }
      }
    })
    this._bounds.expandByScalar(2)
    this._bounds.max.y = Math.min(this._bounds.max.y, this._bounds.min.y + 45)
    this._bounds.getSize(this._span)
  }

  private _probePosition(index: number): THREE.Vector3 {
    const cell = new THREE.Vector3(index % size.x, Math.floor(index / size.x) % size.y, Math.floor(index / (size.x * size.y)))
    return cell.divide(size.clone().subScalar(1)).multiply(this._span).add(this._bounds.min)
  }

  private _measureVisibility(scene: THREE.Scene, index: number): void {
    if (index === 0 || this._surfaces.length === 0) {
      this._surfaces = []
      scene.traverse(object => {
        if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial && object.layers.mask !== 0) {
          this._surfaces.push(object)
        }
      })
    }
    const surfaces = this._surfaces.filter(surface => surface.parent != null)
    const position = this._probePosition(index)
    for (let n = 0; n < 6; ++n) {
      this._ray.set(position, new THREE.Vector3().setComponent(n % 3, n < 3 ? 1 : -1))
      this._ray.far = 600
      const hit = this._ray.intersectObjects(surfaces, false)[0]
      this._visibilityPixels[(Math.floor(n / 3) * count + index) * 4 + (n % 3)] = hit?.distance ?? 600
    }
    this._measured[index] = 1
  }

  private _capture(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    const index = this._index
    if (this._face === 0) {
      this._camera.position.copy(this._probePosition(index))
    }
    captureProbe(renderer, scene, this._camera, facesPerFrame[this._face / 2])
    this._face += 2
    if (this._face < 6) {
      return
    }
    this._face = 0
    const atlas = this._lit ? this._pending : this._target
    atlas.viewport.set(0, 0, count, coefficients)
    atlas.scissor.set(index, 0, 1, coefficients)
    atlas.scissorTest = true
    this._column.value = index
    renderer.setRenderTarget(atlas)
    this._quad.material = this._projection
    this._quad.render(renderer)
    atlas.scissorTest = false
    if (this._visibilityPixels[index * 4 + 3] === 0) {
      this._visibilityPixels[index * 4 + 3] = 1
      this._visibility.needsUpdate = true
    }
    this._ready.value = 1
    ++this._index
    if (this._index < count) {
      return
    }
    this._index = 0
    ++this._bounce
    if (this._lit) {
      this._copy(renderer, this._pending, this._target)
    }
    this._lit = true
    if (this._bounce === bounces) {
      const snapshot = createAtlas()
      this._copy(renderer, this._target, snapshot)
      this._cache.set(this._sun, snapshot)
      this._target = snapshot
      while (this._cache.size > maximumCachedPhases) {
        const [phase, oldest] = this._cache.entries().next().value ?? []
        if (phase == null || oldest == null) {
          break
        }
        this._cache.delete(phase)
        oldest.dispose()
      }
    }
  }

  private _copy(renderer: THREE.WebGLRenderer, source: THREE.WebGLRenderTarget, destination: THREE.WebGLRenderTarget): void {
    this._blend.uniforms.current.value = source.texture
    this._blend.uniforms.target.value = source.texture
    this._blendAmount.value = 1
    renderer.setRenderTarget(destination)
    this._quad.material = this._blend
    this._quad.render(renderer)
  }

  private _blendDisplay(renderer: THREE.WebGLRenderer): void {
    const [current, next] = this._display
    this._blend.uniforms.current.value = current.texture
    this._blend.uniforms.target.value = this._target.texture
    this._blendAmount.value = this._lit ? 0.04 : 1
    renderer.setRenderTarget(next)
    this._quad.material = this._blend
    this._quad.render(renderer)
    this._display = [next, current]
    this._irradiance.value = next.texture
  }
}
