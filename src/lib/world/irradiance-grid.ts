import * as THREE from 'three'
import { LightProbeGenerator } from 'three/addons/lights/LightProbeGenerator.js'
import { captureProbe } from './probe-capture.ts'

const size = new THREE.Vector3(9, 4, 9)
const count = size.x * size.y * size.z
const declarations = `
uniform sampler3D islandIrradiance;
uniform vec3 islandProbeMin;
uniform vec3 islandProbeSpan;
uniform float islandProbeReady;
vec3 islandSH(vec3 cell, int coefficient) {
  return texture(islandIrradiance, vec3((cell.xy + 0.5) / vec2(9.0, 4.0), (cell.z + 0.5 + float(coefficient) * 9.0) / 99.0)).rgb;
}
vec3 islandGI(vec3 worldPosition, vec3 normal) {
  vec3 grid = clamp((worldPosition - islandProbeMin) / islandProbeSpan * vec3(8.0, 3.0, 8.0), vec3(0.0), vec3(7.999, 2.999, 7.999));
  vec3 base = floor(grid);
  vec3 fraction = fract(grid);
  vec3 result = vec3(0.0);
  float total = 0.0;
  for (int n = 0; n < 8; ++n) {
    vec3 corner = vec3(n & 1, (n >> 1) & 1, (n >> 2) & 1);
    vec3 cell = base + corner;
    vec3 probe = islandProbeMin + cell / vec3(8.0, 3.0, 8.0) * islandProbeSpan;
    vec3 delta = worldPosition - probe;
    vec3 positiveDepth = islandSH(cell, 9);
    vec3 negativeDepth = islandSH(cell, 10);
    vec3 limit = mix(negativeDepth, positiveDepth, step(vec3(0.0), delta));
    float visibility = exp(-4.0 * max(max(abs(delta.x) - limit.x, abs(delta.y) - limit.y), max(abs(delta.z) - limit.z, 0.0)));
    vec3 blend = mix(1.0 - fraction, fraction, corner);
    float weight = blend.x * blend.y * blend.z * max(visibility, 0.0001);
    vec3 light = islandSH(cell, 0) * 0.886227;
    light += islandSH(cell, 1) * (1.023328 * normal.y);
    light += islandSH(cell, 2) * (1.023328 * normal.z);
    light += islandSH(cell, 3) * (1.023328 * normal.x);
    light += islandSH(cell, 4) * (0.858086 * normal.x * normal.y);
    light += islandSH(cell, 5) * (0.858086 * normal.y * normal.z);
    light += islandSH(cell, 6) * (0.743125 * normal.z * normal.z - 0.247708);
    light += islandSH(cell, 7) * (0.858086 * normal.x * normal.z);
    light += islandSH(cell, 8) * (0.429043 * (normal.x * normal.x - normal.y * normal.y));
    result += max(light, vec3(0.0)) * weight;
    total += weight;
  }
  return result / max(total, 0.00001);
}`

export class IrradianceGrid {
  private readonly _pixels = new Float32Array(count * 11 * 4)
  private readonly _texture = new THREE.Data3DTexture(this._pixels, size.x, size.y, size.z * 11)
  private readonly _bounds = new THREE.Box3()
  private readonly _span = new THREE.Vector3()
  private readonly _ready = { value: 0 }
  private readonly _materials = new WeakSet<THREE.Material>()
  private readonly _cube = new THREE.WebGLCubeRenderTarget(32, { type: THREE.HalfFloatType })
  private readonly _camera = new THREE.CubeCamera(0.1, 600, this._cube)
  private readonly _ray = new THREE.Raycaster()
  private readonly _cache = new Map<number, Float32Array>()
  private _index = 0
  private _bounce = 0
  private _sun = -1
  private _busy = false
  private _disposed = false
  private _pending = new Float32Array(this._pixels.length)
  private readonly _desired = new Float32Array(this._pixels.length)
  private _hasLighting = false

  public constructor() {
    this._texture.type = THREE.FloatType
    this._texture.format = THREE.RGBAFormat
    this._texture.minFilter = THREE.NearestFilter
    this._texture.magFilter = THREE.NearestFilter
    this._texture.needsUpdate = true
  }

  public prepare(scene: THREE.Scene): void {
    scene.traverse(object => {
      if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshStandardMaterial)) {
        return
      }
      if (this._bounds.isEmpty()) {
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
      const material = object.material
      if (this._materials.has(material)) {
        return
      }
      this._materials.add(material)
      const previous = material.onBeforeCompile
      const key = material.customProgramCacheKey()
      material.onBeforeCompile = (shader, renderer) => {
        previous.call(material, shader, renderer)
        Object.assign(shader.uniforms, {
          islandIrradiance: { value: this._texture },
          islandProbeMin: { value: this._bounds.min },
          islandProbeSpan: { value: this._span },
          islandProbeReady: this._ready,
        })
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${declarations}`).replace(
          '#include <lights_fragment_maps>',
          `#include <lights_fragment_maps>\nif (islandProbeReady > 0.0) {
            vec3 probeWorld = cameraPosition + transpose(mat3(viewMatrix)) * -vViewPosition;
            vec3 probeNormal = transformNormalByInverseViewMatrix(geometryNormal, viewMatrix);
            iblIrradiance = mix(iblIrradiance, islandGI(probeWorld + probeNormal * 0.15, probeNormal), islandProbeReady);
          }`,
        )
      }
      material.customProgramCacheKey = () => `${key}:island-grid-v1`
      material.needsUpdate = true
    })
  }

  public update(renderer: THREE.WebGLRenderer, scene: THREE.Scene, sun: number): void {
    if (this._busy || this._disposed || this._bounds.isEmpty()) {
      return
    }
    if (this._hasLighting) {
      for (let n = 0; n < this._pixels.length; ++n) {
        this._pixels[n] += (this._desired[n] - this._pixels[n]) * 0.15
      }
      this._texture.needsUpdate = true
    }
    if (sun !== this._sun) {
      this._sun = sun
      this._index = 0
      this._bounce = 0
      this._pending.fill(0)
      const cached = this._cache.get(sun)
      if (cached) {
        this._desired.set(cached)
        this._hasLighting = true
        this._texture.needsUpdate = true
        this._ready.value = 1
        this._bounce = 2
      }
    }
    if (this._bounce >= 2) {
      return
    }
    const index = this._index
    const cell = new THREE.Vector3(index % size.x, Math.floor(index / size.x) % size.y, Math.floor(index / (size.x * size.y)))
    this._camera.position.copy(cell).divide(size.clone().subScalar(1)).multiply(this._span).add(this._bounds.min)
    const target = renderer.getRenderTarget()
    const xr = renderer.xr.enabled
    this._busy = true
    renderer.xr.enabled = false
    try {
      captureProbe(renderer, scene, this._camera)
      void LightProbeGenerator.fromCubeRenderTarget(renderer, this._cube)
        .then(probe => {
          if (this._disposed || this._sun !== sun) {
            return
          }
          for (let n = 0; n < 9; ++n) {
            probe.sh.coefficients[n].toArray(this._pending, (n * count + index) * 4)
          }
          const surfaces: THREE.Mesh[] = []
          scene.traverse(object => {
            if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
              surfaces.push(object)
            }
          })
          for (let n = 0; n < 6; ++n) {
            const axis = new THREE.Vector3().setComponent(n % 3, n < 3 ? 1 : -1)
            this._ray.set(this._camera.position, axis)
            this._ray.far = 600
            const hit = this._ray.intersectObjects(surfaces, false).find(hit => hit.object instanceof THREE.Mesh && hit.object.material instanceof THREE.MeshStandardMaterial)
            this._pending[((9 + Math.floor(n / 3)) * count + index) * 4 + (n % 3)] = hit?.distance ?? 600
          }
          ++this._index
          if (this._index === count) {
            this._desired.set(this._pending)
            this._hasLighting = true
            this._texture.needsUpdate = true
            this._ready.value = 1
            this._index = 0
            ++this._bounce
            if (this._bounce === 2) {
              this._cache.set(sun, this._desired.slice())
            }
          }
        })
        .finally(() => {
          this._busy = false
        })
    } finally {
      renderer.xr.enabled = xr
      renderer.setRenderTarget(target)
    }
  }

  public dispose(): void {
    this._disposed = true
    this._texture.dispose()
    this._cube.dispose()
    this._cache.clear()
  }
}
