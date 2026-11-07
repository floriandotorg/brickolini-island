import * as THREE from 'three'
import { type LetterboxAnchor, letterboxBounds, RESOLUTION_RATIO } from '../engine'
import { getSettings } from '../settings.ts'
import { updateFocusedShadow } from '../world/lighting.ts'
import type { Effect } from './effect.ts'
import { RenderBatches } from './render-batches.ts'
import effectFrag from './shader/effect.glsl'
import { WorldShadingEffect } from './world-shading.ts'

export { Effect } from './effect.ts'

const compileFragmentShader = (effects: Effect[]) =>
  effectFrag.replace('/// EFFECTS', effects.map((effect, n) => effect.fragmentShader.replace('void mainImage', `void main${n + 1}`)).join('\n')).replace('/// PIPELINE', effects.map((_, n) => `main${n + 1}(inputColor, outputColor);\ninputColor = outputColor;`).join('\n'))

export abstract class Render {
  private _effects: Effect[] = []

  public material = new THREE.ShaderMaterial()

  public abstract get scene(): THREE.Scene
  public abstract get camera(): THREE.Camera
  public abstract get texture(): THREE.Texture

  public abstract resize(width: number, height: number): void
  public abstract render(renderer: THREE.WebGLRenderer): void

  public addEffect(effect: Effect): void {
    this._effects.push(effect)
  }

  public get shader(): string {
    return compileFragmentShader(this._effects)
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
  private _focusedShadows = getSettings().graphics.preset !== 'original'

  constructor() {
    super()
    this.scene.add(this.camera)
    this.camera.name = 'camera'
    this.camera.rotation.order = 'YXZ'
    const graphics = getSettings().graphics
    if (graphics.ambientOcclusion || graphics.toneMapping === 'filmic') {
      this.addEffect(new WorldShadingEffect(this.camera, this._depth, graphics.ambientOcclusion, graphics.toneMapping === 'filmic'))
    }
  }

  public get texture(): THREE.Texture {
    return this._renderTarget.texture
  }

  public resize(width: number, height: number): void {
    this._renderTarget.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  public render(renderer: THREE.WebGLRenderer): void {
    if (this._focusedShadows) {
      this.scene.traverse(object => {
        if (object instanceof THREE.DirectionalLight && object.castShadow) {
          updateFocusedShadow(object, this.camera)
        }
      })
    }
    renderer.setRenderTarget(this._renderTarget)
    try {
      if (renderer.extensions.has('WEBGL_multi_draw')) {
        this._batches.prepare(this.scene)
      }
      renderer.render(this.scene, this.camera)
    } finally {
      this._batches.restore()
      renderer.setRenderTarget(null)
    }
  }

  public override dispose(): void {
    super.dispose()
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

  private _pipeline: Render[] = []
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
      fragmentShader: compileFragmentShader(this._effects),
      uniforms: {
        tDiffuse: { value: this._renderTarget.texture },
        uTime: { value: 0 },
      },
    })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._postMaterial)
    mesh.position.z = -1
    this._postScene.add(mesh)
  }

  public render(time: number, frozen = false): void {
    this._postMaterial.uniforms.uTime.value = time

    if (!frozen) {
      for (const render of this._pipeline) {
        render.material.uniforms.uTime.value = time
        render.render(this._renderer)
      }

      this._renderer.setRenderTarget(this._renderTarget)
      this._renderer.render(this._scene, this._camera)
    }

    this._renderer.setRenderTarget(null)
    this._renderer.render(this._postScene, this._postCamera)
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
  }

  public resetPipeline(): void {
    for (const object of this._scene.children) {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
      }
    }
    this._scene.clear()
    this._pipeline = []
  }

  public addEffect(effect: Effect): void {
    effect.material = this._postMaterial
    this._effects.push(effect)
    this._postMaterial.uniforms = {
      ...this._postMaterial.uniforms,
      ...effect.uniforms,
    }
    this._postMaterial.fragmentShader = compileFragmentShader(this._effects).replace('fragColor = outputColor;', 'fragColor = linearToOutputTexel(outputColor);')
  }
}
