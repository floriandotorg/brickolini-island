import * as THREE from 'three'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { type LetterboxAnchor, letterboxBounds, RESOLUTION_RATIO } from '../engine'
import { getSettings } from '../settings.ts'
import { CascadedShadows } from '../world/cascaded-shadows.ts'
import { IrradianceGrid } from '../world/irradiance-grid.ts'
import { updateFocusedShadow } from '../world/lighting.ts'
import { ReflectionProbes } from '../world/reflection-probes.ts'
import { DepthOfField } from './depth-of-field.ts'
import type { Effect } from './effect.ts'
import { RenderBatches } from './render-batches.ts'
import effectFrag from './shader/effect.glsl'
import { compileFragmentShader } from './shader-pipeline.ts'
import { WorldShadingEffect } from './world-shading.ts'

export { Effect } from './effect.ts'

export abstract class Render {
  private _effects: Effect[] = []

  public material = new THREE.ShaderMaterial()

  public abstract get scene(): THREE.Scene
  public abstract get camera(): THREE.Camera
  public abstract get texture(): THREE.Texture

  public get empty(): boolean {
    return false
  }

  public abstract resize(width: number, height: number): void
  public abstract render(renderer: THREE.WebGLRenderer): void

  public addEffect(effect: Effect): void {
    this._effects.push(effect)
  }

  public get effects(): readonly Effect[] {
    return this._effects
  }

  public get shader(): string {
    return compileFragmentShader(effectFrag, this._effects)
  }

  public bindEffects(): void {
    for (const effect of this._effects) {
      effect.material = this.material
      Object.assign(this.material.uniforms, effect.uniforms)
    }
  }

  public dispose(): void {
    this.material.dispose()
  }
}

export class Render3D extends Render {
  public scene = new THREE.Scene()
  public camera = new THREE.PerspectiveCamera(75, RESOLUTION_RATIO)

  private _depth = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType)
  private _renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
    depthTexture: this._depth,
    stencilBuffer: false,
    samples: 4,
  })
  private readonly _batches = new RenderBatches()
  private readonly _irradiance = getSettings().graphics.pbrMaterials ? new IrradianceGrid() : null
  private _probeFrame = 0
  private readonly _reflections = getSettings().graphics.pbrMaterials ? new ReflectionProbes() : null
  private readonly _dof = getSettings().graphics.postProcessing ? new DepthOfField(this.camera, this._depth) : null
  private _processed: THREE.Texture | null = null
  private readonly _bloom = getSettings().graphics.postProcessing ? new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.55, 0.85) : null

  public set cinematic(value: boolean) {
    if (this._dof) {
      this._dof.cinematic = value
    }
  }
  private _focusedShadows = getSettings().graphics.preset !== 'original'
  private readonly _cascades = getSettings().graphics.shadows && getSettings().graphics.preset !== 'original' ? new CascadedShadows() : null

  constructor() {
    super()
    this.scene.add(this.camera)
    this.camera.name = 'camera'
    this.camera.rotation.order = 'YXZ'
    this.scene.onBeforeRender = (_renderer, _scene, camera) => this._batches.setReflection(camera !== this.camera)
    this.scene.onAfterRender = () => this._batches.setReflection(false)
    const graphics = getSettings().graphics
    if (graphics.ambientOcclusion || graphics.toneMapping === 'filmic') {
      this.addEffect(new WorldShadingEffect(this.camera, this._depth, graphics.ambientOcclusion, graphics.toneMapping === 'filmic'))
    }
  }

  public get texture(): THREE.Texture {
    return this._processed ?? this._renderTarget.texture
  }

  public resize(width: number, height: number): void {
    this._renderTarget.setSize(width, height)
    this._dof?.resize(width, height)
    this._bloom?.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  public render(renderer: THREE.WebGLRenderer): void {
    this._cascades?.update(this.scene, this.camera)
    this._reflections?.update(renderer, this.scene, this.camera)
    if (this._irradiance != null) {
      this._irradiance.prepare(this.scene)
      if (++this._probeFrame % 8 === 0) {
        const sun = this.scene.children.find(object => object instanceof THREE.DirectionalLight)
        const phase = sun instanceof THREE.DirectionalLight ? Math.round(Math.atan2(sun.position.y - sun.target.position.y, sun.position.x - sun.target.position.x) * 8) : 0
        this._irradiance.update(renderer, this.scene, phase)
      }
    }
    renderer.setRenderTarget(this._renderTarget)
    try {
      const batching = renderer.extensions.has('WEBGL_multi_draw')
      if (batching) {
        this._batches.prepare(this.scene)
      }
      if (this._focusedShadows && this._cascades == null) {
        if (batching) {
          for (const light of this._batches.directionalLights) {
            if (light.castShadow) {
              updateFocusedShadow(light, this.camera)
            }
          }
        } else {
          this.scene.traverse(object => {
            if (object instanceof THREE.DirectionalLight && object.castShadow) {
              updateFocusedShadow(object, this.camera)
            }
          })
        }
      }
      renderer.render(this.scene, this.camera)
      for (const effect of this.effects) {
        if (effect instanceof WorldShadingEffect) {
          effect.updateSun(this.scene)
        }
      }
      this._bloom?.render(renderer, this._renderTarget, this._renderTarget, 0, false)
      this._processed = this._dof?.render(renderer, this._renderTarget.texture, this.camera) ?? null
      if (this.material.uniforms.tDiffuse) {
        this.material.uniforms.tDiffuse.value = this.texture
      }
    } finally {
      this._batches.restore()
      renderer.setRenderTarget(null)
    }
  }

  public override dispose(): void {
    super.dispose()
    for (const effect of this.effects) {
      if (effect instanceof WorldShadingEffect) {
        effect.dispose()
      }
    }
    this._cascades?.dispose()
    this._bloom?.dispose()
    this._dof?.dispose()
    this._reflections?.dispose()
    this._irradiance?.dispose()
    this._batches.dispose()
    this._renderTarget.dispose()
    this._depth.dispose()
  }
}

export class Render2D extends Render {
  public scene = new THREE.Scene()
  public camera = new THREE.OrthographicCamera()
  public letterbox = false
  public letterboxAnchor: LetterboxAnchor = 'center'
  private _bounds = { left: -1, right: 1, top: 1, bottom: -1 }

  private _renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    stencilBuffer: false,
  })

  public override get empty(): boolean {
    return this.scene.background == null && this.scene.children.every(object => object === this.camera)
  }

  public get texture(): THREE.Texture {
    return this._renderTarget.texture
  }

  constructor() {
    super()
    this.scene.add(this.camera)
  }

  public render(renderer: THREE.WebGLRenderer): void {
    renderer.setRenderTarget(this._renderTarget)
    renderer.render(this.scene, this.camera)
    renderer.setRenderTarget(null)
  }

  public resize(width: number, height: number): void {
    this._renderTarget.setSize(width, height)
    if (this.letterbox) {
      this._bounds = letterboxBounds(width, height, RESOLUTION_RATIO, this.letterboxAnchor)
      this.camera.left = this._bounds.left
      this.camera.right = this._bounds.right
      this.camera.top = this._bounds.top
      this.camera.bottom = this._bounds.bottom
      this.camera.updateProjectionMatrix()
    }
  }

  public override dispose(): void {
    super.dispose()
    this._renderTarget.dispose()
  }

  public contentNDC(ndcX: number, ndcY: number): [number, number] {
    const { left, right, top, bottom } = this._bounds
    const x = ((ndcX + 1) / 2) * (right - left) + left
    const y = ((ndcY + 1) / 2) * (top - bottom) + bottom
    return [x, y]
  }
}

export class Composer {
  private _renderer: THREE.WebGLRenderer
  private _scene = new THREE.Scene()
  private _camera = new THREE.OrthographicCamera()

  private _postScene = new THREE.Scene()
  private _postCamera = new THREE.OrthographicCamera()
  private _postMaterial: THREE.ShaderMaterial
  private _postMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  private readonly _fused = new Map<Render3D, THREE.ShaderMaterial>()
  private _directFrame = false
  private _directCompositionEnabled = true

  private _pipeline: Render[] = []
  private readonly _layers = new Map<Render, THREE.Mesh>()
  private _effects: Effect[] = []
  private _width = 1
  private _height = 1

  private _renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    stencilBuffer: false,
  })

  public get renderer(): THREE.WebGLRenderer {
    return this._renderer
  }

  constructor(canvas: HTMLCanvasElement, renderer: THREE.WebGLRenderer) {
    this._renderer = renderer
    this._width = canvas.width
    this._height = canvas.height

    this._postMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      fragmentShader: compileFragmentShader(effectFrag, this._effects),
      uniforms: {
        tDiffuse: { value: this._renderTarget.texture },
        uTime: { value: 0 },
      },
    })
    this._postMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._postMaterial)
    this._postMesh.position.z = -1
    this._postScene.add(this._postMesh)
  }

  public render(time: number, frozen = false): void {
    this._postMaterial.uniforms.uTime.value = time

    if (!frozen) {
      let single: Render | null = null
      let active = 0
      for (const render of this._pipeline) {
        const layer = this._layers.get(render)
        if (layer != null) {
          layer.visible = !render.empty
        }
        if (render.empty) {
          continue
        }
        single = render
        ++active
        render.material.uniforms.uTime.value = time
        render.render(this._renderer)
      }

      if (this._directCompositionEnabled && active === 1 && single instanceof Render3D) {
        this._renderDirect(single)
        this._directFrame = true
        return
      }
    }
    if (!frozen || this._directFrame) {
      this._renderer.setRenderTarget(this._renderTarget)
      this._renderer.render(this._scene, this._camera)
      this._directFrame = false
    }

    this._renderer.setRenderTarget(null)
    this._renderer.render(this._postScene, this._postCamera)
  }

  private _renderDirect(render: Render3D): void {
    let material = this._fused.get(render)
    if (material == null) {
      material = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        fragmentShader: compileFragmentShader(effectFrag, [...render.effects, ...this._effects], render.effects.length).replace('fragColor = outputColor;', 'fragColor = linearToOutputTexel(outputColor);'),
        uniforms: { ...render.material.uniforms, ...this._postMaterial.uniforms, tDiffuse: { value: render.texture } },
      })
      this._fused.set(render, material)
    }
    this._renderer.setRenderTarget(null)
    this._postMesh.material = material
    try {
      this._renderer.render(this._postScene, this._postCamera)
    } finally {
      this._postMesh.material = this._postMaterial
    }
  }

  public resize(width: number, height: number): void {
    this._width = width
    this._height = height
    this._renderTarget.setSize(width, height)

    for (const render of this._pipeline) {
      render.resize(width, height)
    }
  }

  public add(render: Render): void {
    render.resize(this._width, this._height)
    this._pipeline.push(render)
    render.material.dispose()
    render.material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      fragmentShader: render.shader,
      uniforms: {
        tDiffuse: { value: render.texture },
        uTime: { value: 0 },
      },
      transparent: true,
    })
    render.bindEffects()
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), render.material)
    mesh.position.z = -100 + this._pipeline.length
    this._scene.add(mesh)
    this._layers.set(render, mesh)
  }

  public resetPipeline(): void {
    for (const object of this._scene.children) {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
      }
    }
    this._scene.clear()
    this._pipeline = []
    this._layers.clear()
    for (const material of this._fused.values()) {
      material.dispose()
    }
    this._fused.clear()
    this._directFrame = false
  }

  public addEffect(effect: Effect): void {
    for (const material of this._fused.values()) {
      material.dispose()
    }
    this._fused.clear()
    effect.material = this._postMaterial
    this._effects.push(effect)
    this._postMaterial.uniforms = {
      ...this._postMaterial.uniforms,
      ...effect.uniforms,
    }
    this._postMaterial.fragmentShader = compileFragmentShader(effectFrag, this._effects).replace('fragColor = outputColor;', 'fragColor = linearToOutputTexel(outputColor);')
  }
}
