import * as THREE from 'three'
import { markSharedShaderHook } from '../effect/render-batches.ts'
import { captureProbe } from './probe-capture.ts'

const makeProbe = () => ({
  target: new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter }),
  position: new THREE.Vector3(),
  min: new THREE.Vector3(),
  max: new THREE.Vector3(),
  ready: { value: 0 },
  key: '',
})

export class ReflectionProbes {
  private readonly _probes = [makeProbe(), makeProbe()]
  private readonly _materials = new WeakSet<THREE.Material>()
  private _frame = 0
  private _slot = 0

  private _pending: ReturnType<typeof makeProbe> | null = null
  private readonly _capture = new THREE.CubeCamera(0.1, 600, this._probes[0].target)

  public capture(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    const probe = this._pending
    if (probe == null) {
      return
    }
    this._pending = null
    const ready = this._probes.map(probe => probe.ready.value)
    for (const probe of this._probes) {
      probe.ready.value = 0
    }
    try {
      this._capture.renderTarget = probe.target
      this._capture.position.copy(probe.position)
      this._capture.updateMatrixWorld()
      captureProbe(renderer, scene, this._capture)
    } finally {
      for (let n = 0; n < 2; ++n) {
        this._probes[n].ready.value = ready[n]
      }
      probe.ready.value = 1
    }
  }

  public prepare(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    const position = camera.getWorldPosition(new THREE.Vector3())
    const key = `${Math.floor(position.x / 24)},${Math.floor(position.y / 8)},${Math.floor(position.z / 24)}`
    if (++this._frame % 120 === 1 && !this._probes.some(probe => probe.key === key)) {
      const probe = this._probes[this._slot++ % 2]
      probe.position.copy(position)
      probe.key = key
      probe.min.copy(position).sub(new THREE.Vector3(24, 8, 24))
      probe.max.copy(position).add(new THREE.Vector3(24, 8, 24))
      const ray = new THREE.Raycaster()
      const surfaces: THREE.Mesh[] = []
      scene.traverse(object => {
        if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
          surfaces.push(object)
        }
      })
      for (let n = 0; n < 6; ++n) {
        ray.set(position, new THREE.Vector3().setComponent(n % 3, n < 3 ? 1 : -1))
        ray.far = n % 3 === 1 ? 8 : 24
        const hit = ray.intersectObjects(surfaces, false)[0]
        if (hit) {
          const bound = n < 3 ? probe.max : probe.min
          bound.setComponent(n % 3, hit.point.getComponent(n % 3))
        }
      }
      this._pending = probe
    }
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
      let declarations = ''
      let sampling = ''
      for (let n = 0; n < 2; ++n) {
        const probe = this._probes[n]
        Object.assign(shader.uniforms, {
          [`localCube${n}`]: { value: probe.target.texture },
          [`localPosition${n}`]: { value: probe.position },
          [`localMin${n}`]: { value: probe.min },
          [`localMax${n}`]: { value: probe.max },
          [`localReady${n}`]: probe.ready,
        })
        declarations += `uniform samplerCube localCube${n}; uniform vec3 localPosition${n}, localMin${n}, localMax${n}; uniform float localReady${n};\n`
        sampling += `{
          vec3 world = cameraPosition + transpose(mat3(viewMatrix)) * -vViewPosition;
          vec3 safeRay = sign(reflectVec) * max(abs(reflectVec), vec3(0.00001));
          vec3 intersections = max((localMax${n} - world) / safeRay, (localMin${n} - world) / safeRay);
          float distance = min(min(intersections.x, intersections.y), intersections.z);
          vec3 projected = world + reflectVec * distance - localPosition${n};
          vec3 boundary = min(world - localMin${n}, localMax${n} - world);
          float weight = localReady${n} * smoothstep(0.0, 1.5, min(min(boundary.x, boundary.y), boundary.z));
          localLight += textureLod(localCube${n}, projected, roughness * 7.0).rgb * weight;
          localWeight += weight;
        }`
      }
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <envmap_physical_pars_fragment>',
        declarations +
          THREE.ShaderChunk.envmap_physical_pars_fragment.replace(
            'return envMapColor.rgb * envMapIntensity;',
            `vec3 localLight = vec3(0.0); float localWeight = 0.0; ${sampling}
        return mix(envMapColor.rgb * envMapIntensity, localLight / max(localWeight, 0.0001), clamp(localWeight, 0.0, 1.0));`,
          ),
      )
    }
    material.customProgramCacheKey = () => `${key}:local-reflections-v1`
    material.needsUpdate = true
    markSharedShaderHook(material)
  }

  public dispose(): void {
    for (const probe of this._probes) {
      probe.target.dispose()
    }
  }
}
