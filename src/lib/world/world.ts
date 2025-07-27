import * as THREE from 'three'
import type { AnimationAction, ParallelAction, PhonemeAction, PositionalAudioAction } from '../action-types'
import { type Animation3DNode, animationToTracks, findRecursively, parse3DAnimation } from '../assets/animation'
import { getPositionalAudio } from '../assets/audio'
import { getAction } from '../assets/load'
import { getPart } from '../assets/model'
import { WDB } from '../assets/wdb'
import { engine, RESOLUTION_RATIO } from '../engine'
import { Actor } from './actor'

export abstract class World {
  protected _scene = new THREE.Scene()
  protected _camera = new THREE.PerspectiveCamera(75, RESOLUTION_RATIO)

  private _debugGroup: THREE.Group = new THREE.Group()
  private _debugBox: HTMLElement
  private _debugPosition: HTMLElement
  private _debugDirection: HTMLElement
  private _debugSlewMode: HTMLElement

  private _raycaster = new THREE.Raycaster()
  private _clickListeners = new Map<THREE.Object3D, (event: MouseEvent) => void>()
  private _runningAnimations: {
    mixer: THREE.AnimationMixer
    clipAction: THREE.AnimationAction
    audios: THREE.PositionalAudio[]
    resolve: () => void
  }[] = []

  public currentActor: 'pepper' | 'papa' | 'mama' | 'nick' | 'laura' = 'pepper'

  constructor() {
    this._camera.rotation.order = 'YXZ'

    const getElement = (id: string): HTMLElement => {
      const element = document.getElementById(id)
      if (element == null) {
        throw new Error(`Element ${id} not found`)
      }
      return element
    }

    this._debugBox = getElement('debug')
    this._debugPosition = getElement('debug-position')
    this._debugDirection = getElement('debug-direction')
    this._debugSlewMode = getElement('debug-slew-mode')

    this.debugMode = false

    this._scene.add(this._debugGroup)
  }

  public get scene(): THREE.Scene {
    return this._scene
  }

  protected setVerticalFOV(fov: number): void {
    this._camera.fov = 2 * Math.atan(Math.tan((fov * Math.PI) / 180 / 2) / this._camera.aspect) * (180 / Math.PI)
    this._camera.updateProjectionMatrix()
  }

  public setupCameraForAnimation(animationNode: Animation3DNode): void {
    const cameraConfigPath = findRecursively(animationNode, c => c.name.startsWith('cam'))
    if (cameraConfigPath == null) {
      return
    }

    const pathToPosition = (path: Animation3DNode[]) =>
      path.reduce((acc, node) => {
        if (node.translationKeys.length === 0) {
          return acc
        }
        if (node.translationKeys.length !== 1) {
          throw new Error(`Expected one translation key, got ${node.translationKeys.length}`)
        }
        if (node.translationKeys[0].timeAndFlags.time > 0) {
          throw new Error(`Translation key has time > 0`)
        }
        if (node.translationKeys[0].timeAndFlags.flags > 1) {
          throw new Error(`Translation key has flags > 1`)
        }
        if (node.rotationKeys.length > 0) {
          throw new Error(`Rotation keys found`)
        }
        if (node.scaleKeys.length > 0) {
          throw new Error(`Scale keys found`)
        }
        return acc.add(node.translationKeys[0].vertex)
      }, new THREE.Vector3())

    const cameraConfig = cameraConfigPath.at(-1)
    if (cameraConfig == null) {
      throw new Error('Camera config not found')
    }

    const match = cameraConfig.name.match(/^cam(\d{2})$/)
    if (match?.[1] == null) {
      throw new Error('Camera fov not found')
    }
    this.setVerticalFOV(Number.parseInt(match[1]))

    this._camera.position.copy(pathToPosition(cameraConfigPath))

    const lookAtPositionPath = findRecursively(animationNode, c => c.name === 'target')
    if (lookAtPositionPath == null) {
      throw new Error('Look at position not found')
    }

    this._camera.lookAt(pathToPosition(lookAtPositionPath))
  }

  public async playAnimation(action: ParallelAction<AnimationAction | PositionalAudioAction | PhonemeAction>): Promise<void> {
    const animationActions = action.children.filter(c => c.presenter === 'LegoAnimPresenter')
    if (animationActions.length !== 1) {
      throw new Error('Expected one animation')
    }

    const animation = parse3DAnimation(await getAction(animationActions[0]))
    this.setupCameraForAnimation(animation.tree)

    const actors = new THREE.Group()

    for (const actor of animation.actors) {
      switch (actor.type) {
        case WDB.ActorType.Unknown: {
          const node = this.scene.getObjectByName(actor.name)
          if (node == null) {
            throw new Error(`Actor not found: ${actor.name}`)
          }
          actors.add(node)
          break
        }
        case WDB.ActorType.ManagedActor: {
          const minifig = await Actor.create(this, actor.name.replace(/^\*/, ''))
          if (actor.name.startsWith('*')) {
            minifig.mesh.visible = false
          }
          actors.add(minifig.mesh)
          break
        }
        case WDB.ActorType.ManagedInvisibleRoi: {
          const node = this.scene.getObjectByName(actor.name)
          if (node == null) {
            throw new Error(`Actor not found: ${actor.name}`)
          }
          node.visible = false
          actors.add(node)
          break
        }
        case WDB.ActorType.ManagedInvisibleRoiTrimmed: {
          const node = this.scene.getObjectByName(actor.name.replace(/[0-9_]*$/, ''))
          if (node == null) {
            throw new Error(`Actor not found: ${actor.name}`)
          }
          node.visible = false
          actors.add(node)
          break
        }
        case WDB.ActorType.SceneRoi1:
        case WDB.ActorType.SceneRoi2: {
          const node = this.scene.getObjectByName(actor.name) ?? (await getPart(actor.name, null, null))
          if (node == null) {
            throw new Error(`Actor not found: ${actor.name}`)
          }
          actors.add(node)
          break
        }
        default:
          throw new Error(`Unsupported actor type ${actor.type} for ${actor.name}`)
      }
    }

    const audios: THREE.PositionalAudio[] = await Promise.all(
      action.children
        .filter(c => c.presenter === 'Lego3DWavePresenter')
        .map(async audio => {
          const actor = actors.getObjectByName(audio.extra)
          if (actor == null) {
            throw new Error(`Actor not found: ${audio.extra}`)
          }
          return this.playPositionalAudio(audio, actor, audio.startTime / 1_000)
        }),
    )

    this.scene.add(actors)

    const clip = new THREE.AnimationClip(animation.tree.name, -1, animationToTracks(animation.tree))
    return this.playAnimationClip(actors, clip, audios)
  }

  public async playAnimationClip(root: THREE.Object3D, clip: THREE.AnimationClip, audios: THREE.PositionalAudio[] = []): Promise<void> {
    const mixer = new THREE.AnimationMixer(root)
    const clipAction = mixer.clipAction(clip)
    clipAction.loop = THREE.LoopOnce
    clipAction.clampWhenFinished = true
    clipAction.play()
    return new Promise(resolve => {
      this._runningAnimations.push({ mixer, clipAction, audios, resolve })
      mixer.addEventListener('finished', () => {
        this._runningAnimations = this._runningAnimations.filter(a => a.mixer !== mixer)
        resolve()
      })
    })
  }

  public addClickListener(objects: THREE.Object3D, onClick: (event: MouseEvent) => void): void {
    this._clickListeners.set(objects, onClick)
  }

  public click(event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), this._camera)
    let hit: THREE.Object3D | null = this._raycaster.intersectObjects(Array.from(this._clickListeners.keys()))[0]?.object
    while (hit != null) {
      const onClick = this._clickListeners.get(hit)
      if (hit.visible && onClick != null) {
        onClick(event)
        break
      }
      hit = hit.parent
    }
  }

  public pointerDown(_event: MouseEvent, _normalizedX: number, _normalizedY: number): void {}
  public pointerUp(_event: MouseEvent): void {}

  public get debugMode(): boolean {
    return this._debugGroup.visible
  }

  protected set debugMode(value: boolean) {
    this._debugGroup.visible = value
    this._debugBox.classList.toggle('hidden', !value)
  }

  protected setDebugData(position: THREE.Vector3, direction: THREE.Vector3, slewMode: boolean): void {
    this._debugPosition.textContent = `x: ${position.x.toFixed(4)}, y: ${position.y.toFixed(4)}, z: ${position.z.toFixed(4)}`
    this._debugDirection.textContent = `x: ${direction.x.toFixed(4)}, y: ${direction.y.toFixed(4)}, z: ${direction.z.toFixed(4)}`
    this._debugSlewMode.classList.toggle('hidden', !slewMode)
  }

  private _initialized = false

  public get initialized(): boolean {
    return this._initialized
  }

  public async init(): Promise<void> {
    if (this._initialized) {
      throw new Error('World already initialized')
    }

    this._initialized = true
  }

  public update(delta: number): void {
    for (const { mixer } of this._runningAnimations) {
      mixer.update(delta)
    }
  }

  public activate(_param?: unknown): void {
    this._camera.add(engine.audioListener)
  }

  public deactivate(): void {
    this._camera.remove(engine.audioListener)
  }

  public async playPositionalAudio(action: PositionalAudioAction, parent: THREE.Object3D, delay?: number): Promise<THREE.PositionalAudio> {
    const audio = await getPositionalAudio(engine.audioListener, action)
    parent.add(audio)
    audio.onEnded = () => {
      parent.remove(audio)
    }
    audio.play(delay)
    return audio
  }

  public resize(_width: number, _height: number): void {}

  public render(renderer: THREE.WebGLRenderer): void {
    renderer.render(this._scene, this._camera)
  }

  public keyPressed(key: string): void {
    if (key === 'd' && import.meta.env.DEV) {
      this.debugMode = !this.debugMode
    }

    if (key === 'c') {
      switch (this.currentActor) {
        case 'pepper':
          this.currentActor = 'papa'
          break
        case 'papa':
          this.currentActor = 'mama'
          break
        case 'mama':
          this.currentActor = 'nick'
          break
        case 'nick':
          this.currentActor = 'laura'
          break
        case 'laura':
          this.currentActor = 'pepper'
          break
      }
      console.log(`Current actor: ${this.currentActor}`)
    }

    if (key === ' ') {
      for (const runningAnimation of this._runningAnimations) {
        runningAnimation.clipAction.time = runningAnimation.clipAction.getClip().duration
        for (const audio of runningAnimation.audios) {
          audio.stop()
        }
      }
    }
  }

  public debugDrawArrow(from: THREE.Vector3, to: THREE.Vector3, color: string): THREE.ArrowHelper {
    const dir = to.clone().sub(from).normalize()
    const length = from.distanceTo(to)
    const arrow = new THREE.ArrowHelper(dir, from, length, color)
    this._debugGroup.add(arrow)
    return arrow
  }

  public debugDrawSphere(position: THREE.Vector3, color: string, radius = 1): THREE.Mesh {
    const sphere = new THREE.SphereGeometry(radius)
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
    const mesh = new THREE.Mesh(sphere, material)
    mesh.position.copy(position)
    this._debugGroup.add(mesh)
    return mesh
  }

  public debugDrawPlane(anchor: THREE.Vector3, normal: THREE.Vector3, color: string): THREE.Mesh {
    const planeGeometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
    const mesh = new THREE.Mesh(planeGeometry, material)
    mesh.position.copy(anchor)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
    this._debugGroup.add(mesh)
    return mesh
  }

  public debugDrawDebugMesh(mesh: THREE.Mesh): void {
    mesh.material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    this._debugGroup.add(mesh)
  }

  public debugDrawText(position: THREE.Vector3, text: string, color: string): THREE.Sprite {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff }))
    sprite.position.copy(position)
    sprite.scale.set(2, 1, 1)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx == null) {
      throw new Error('Context not found')
    }
    ctx.font = '20px sans-serif'
    const metrics = ctx.measureText(text)
    canvas.width = Math.ceil(metrics.width) + 16
    canvas.height = 32
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 32, 16)
    const texture = new THREE.CanvasTexture(canvas)
    sprite.material.map = texture
    sprite.material.needsUpdate = true
    this._debugGroup.add(sprite)
    return sprite
  }
}
