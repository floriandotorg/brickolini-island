import * as THREE from 'three'
import { RESOLUTION_RATIO } from '../engine'
import effectFrag from './shader/effect.glsl'

export abstract class Effect {
  private _material: THREE.ShaderMaterial | null = null

  abstract get fragmentShader(): string
  get uniforms(): Record<string, THREE.IUniform> {
    return {}
  }

  set material(material: THREE.ShaderMaterial) {
    this._material = material
  }

  get material(): THREE.ShaderMaterial {
    if (this._material == null) {
      throw new Error('Material not set')
    }
    return this._material
  }
}

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
}

export class Render3D extends Render {
  public scene = new THREE.Scene()
  public camera = new THREE.PerspectiveCamera(75, RESOLUTION_RATIO)

  private _renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    stencilBuffer: false,
    samples: 4,
  })

  constructor() {
    super()
    this.scene.add(this.camera)
    this.camera.rotation.order = 'YXZ'
  }

  public get texture(): THREE.Texture {
    return this._renderTarget.texture
  }

  public resize(width: number, height: number): void {
    this._renderTarget.setSize(width, height)
  }

  public render(renderer: THREE.WebGLRenderer): void {
    renderer.setRenderTarget(this._renderTarget)
    renderer.render(this.scene, this.camera)
    renderer.setRenderTarget(null)
  }
}

export class Render2D extends Render {
  public scene = new THREE.Scene()
  public camera = new THREE.OrthographicCamera()

  private _renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.FloatType,
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
  }
}

export class Composer {
  private _canvas: HTMLCanvasElement
  private _renderer: THREE.WebGLRenderer
  private _scene = new THREE.Scene()
  private _camera = new THREE.OrthographicCamera()

  private _postScene = new THREE.Scene()
  private _postCamera = new THREE.OrthographicCamera()
  private _postMaterial: THREE.ShaderMaterial

  private _pipeline: Render[] = []
  private _effects: Effect[] = []

  private _renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.FloatType,
    stencilBuffer: false,
  })

  public get renderer(): THREE.WebGLRenderer {
    return this._renderer
  }

  constructor(canvas: HTMLCanvasElement, renderer: THREE.WebGLRenderer) {
    this._canvas = canvas
    this._renderer = renderer
    this._renderer.setPixelRatio(window.devicePixelRatio)

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

  public render(time: number): void {
    this._postMaterial.uniforms.uTime.value = time

    for (const render of this._pipeline) {
      render.material.uniforms.uTime.value = time
      render.render(this._renderer)
    }

    this._renderer.setRenderTarget(this._renderTarget)
    this._renderer.render(this._scene, this._camera)

    this._renderer.setRenderTarget(null)
    this._renderer.render(this._postScene, this._postCamera)
  }

  public resize(width: number, height: number): void {
    this._renderer.setSize(width, height)
    this._renderTarget.setSize(width, height)

    for (const render of this._pipeline) {
      render.resize(width, height)
    }
  }

  public add(render: Render): void {
    render.resize(this._canvas.width, this._canvas.height)
    this._pipeline.push(render)
    render.material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      fragmentShader: render.shader,
      uniforms: {
        tDiffuse: { value: render.texture },
        uTime: { value: 0 },
      },
      transparent: true,
    })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), render.material)
    mesh.position.z = -100 + this._pipeline.length
    this._scene.add(mesh)
  }

  public resetPipeline(): void {
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
