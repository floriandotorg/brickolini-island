import * as THREE from 'three'
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js'

export class DepthOfField {
  public cinematic = false
  private readonly _target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false })
  private readonly _material: THREE.ShaderMaterial
  private readonly _quad: FullScreenQuad
  private _focus = 18

  public constructor(camera: THREE.PerspectiveCamera, depth: THREE.DepthTexture) {
    this._material = new THREE.ShaderMaterial({
      uniforms: {
        source: { value: null },
        depth: { value: depth },
        projectionInverse: { value: camera.projectionMatrixInverse },
        focus: { value: this._focus },
        strength: { value: 1 },
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D source;
        uniform sampler2D depth;
        uniform mat4 projectionInverse;
        uniform float focus;
        uniform float strength;
        float distanceAt(vec2 uv) {
          vec4 p = projectionInverse * vec4(uv * 2.0 - 1.0, texture2D(depth, uv).r * 2.0 - 1.0, 1.0);
          return -p.z / p.w;
        }
        void main() {
          vec2 resolution = vec2(textureSize(source, 0));
          float distance = distanceAt(vUv);
          float coc = clamp(abs(distance - focus) / max(distance, 0.1), 0.0, 1.0);
          float tilt = smoothstep(0.2, 0.5, abs(vUv.y - 0.5));
          float radius = min(coc * strength + tilt * 0.6, 8.0);
          vec4 color = texture2D(source, vUv);
          float weight = 1.0;
          for (int n = 0; n < 32; ++n) {
            float angle = float(n) * 2.399963;
            vec2 offset = vec2(cos(angle), sin(angle)) * sqrt((float(n) + 0.5) / 32.0) * radius / resolution;
            vec2 uv = clamp(vUv + offset, vec2(0.0), vec2(1.0));
            float sampleDistance = distanceAt(uv);
            float accept = 1.0 - smoothstep(0.5, 2.0, max(distance - sampleDistance, 0.0));
            color += texture2D(source, uv) * accept;
            weight += accept;
          }
          gl_FragColor = color / weight;
        }`,
      depthTest: false,
      depthWrite: false,
    })
    this._quad = new FullScreenQuad(this._material)
  }

  public render(renderer: THREE.WebGLRenderer, source: THREE.Texture, camera: THREE.PerspectiveCamera): THREE.Texture {
    const ray = new THREE.Raycaster()
    ray.setFromCamera(new THREE.Vector2(), camera)
    const hit = camera.parent == null ? undefined : ray.intersectObjects(camera.parent.children, true).find(hit => hit.object instanceof THREE.Mesh && hit.distance > 1 && hit.distance < 100)
    this._focus = THREE.MathUtils.lerp(this._focus, hit?.distance ?? 18, 0.04)
    this._material.uniforms.focus.value = this._focus
    this._material.uniforms.strength.value = this.cinematic ? 7 : 1.1
    this._material.uniforms.source.value = source
    renderer.setRenderTarget(this._target)
    this._quad.render(renderer)
    renderer.setRenderTarget(null)
    return this._target.texture
  }

  public resize(width: number, height: number): void {
    this._target.setSize(width, height)
  }

  public dispose(): void {
    this._target.dispose()
    this._material.dispose()
    this._quad.dispose()
  }
}
