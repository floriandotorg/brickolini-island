import * as THREE from 'three'
import { Action } from '../../actions/types'
import { type AnimationAction, type AudioAction, getExtraValue, type ParallelAction, type PhonemeAction, type PositionalAudioAction, splitExtraValue } from '../action-types'
import { type Animation3D, type Animation3DNode, type AnimationActor, animationToTracks, createAnimationActor, findRecursively, getBeforeAndAfter, parse3DAnimation } from '../assets/animation'
import { getPositionalAudio } from '../assets/audio'
import { getAction, getActionFileUrl } from '../assets/load'
import { getGlobalPart } from '../assets/model'
import { WDB } from '../assets/wdb'
import { type Composer, Render3D } from '../effect/composer'
import { engine } from '../engine'
import { Actor } from './actor'

export type WorldName = 'isle' | 'hospital' | 'garage' | 'infomain' | 'regbook' | 'infodoor' | 'infoscor' | 'elevbott' | 'police' | 'polidoor' | 'garadoor' | 'copter' | 'dunecar' | 'jetski' | 'racecar'

type FaceAnimation = {
  actor: Actor
  currentVideoElement?: HTMLVideoElement
  animations: {
    start: number
    duration: number
    videoElement: HTMLVideoElement
    videoTexture: THREE.VideoTexture
  }[]
}

export type BuiltAnimation = {
  animation: Animation3D
  animationActors: Map<string, AnimationActor>
  positionalAudioActions: PositionalAudioAction[]
  audioActions: AudioAction[]
  tracks: THREE.KeyframeTrack[]
  lookAtKeys?: WDB.Animation.VertexKey[]
  faceAnimations: FaceAnimation[]
  pointAtCameraObjects: THREE.Object3D[]
  location: THREE.Vector3
}

export abstract class World {
  protected _render = new Render3D()

  private _debugGroup: THREE.Group = new THREE.Group()
  private _debugBox: HTMLElement
  private _debugPosition: HTMLElement
  private _debugDirection: HTMLElement
  private _debugSlewMode: HTMLElement

  private _raycaster = new THREE.Raycaster()
  private _clickListeners = new Map<THREE.Object3D, (event: MouseEvent) => Promise<boolean>>()
  private _runningAnimations: {
    mixer: THREE.AnimationMixer
    clipAction: THREE.AnimationAction
    audios: THREE.PositionalAudio[]
    resolve: () => void
    lookAtKeys?: WDB.Animation.VertexKey[]
    lockCamera?: boolean
    unskippable?: boolean
    faceAnimations: FaceAnimation[]
    pointAtCameraObjects: THREE.Object3D[]
    stopAtTime?: number
  }[] = []
  private _runningAudios: THREE.Audio<GainNode>[] = []
  private _actors = new Map<string, Actor>()
  private _worldGroup: THREE.Group | null = null

  constructor(public readonly name: WorldName) {
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

    this.debugMode = new URLSearchParams(window.location.search).get('debug') === 'true'

    this._render.scene.add(this._debugGroup)
  }

  public get isRunningCameraAnimation(): boolean {
    return this._runningAnimations.some(a => a.lookAtKeys != null || a.lockCamera)
  }

  public get scene(): THREE.Scene {
    return this._render.scene
  }

  public get worldGroup(): THREE.Group {
    if (this._worldGroup == null) {
      throw new Error('World group is not set yet')
    }
    return this._worldGroup
  }

  public set worldGroup(value: THREE.Group) {
    if (this._worldGroup != null) {
      throw new Error('World group is already set')
    }
    this._worldGroup = value
    this.scene.add(this._worldGroup)
  }

  protected get camera(): THREE.PerspectiveCamera {
    return this._render.camera
  }

  protected setVerticalFOV(fov: number): void {
    this._render.camera.fov = 2 * Math.atan(Math.tan((fov * Math.PI) / 180 / 2) / this._render.camera.aspect) * (180 / Math.PI)
    this._render.camera.updateProjectionMatrix()
  }

  public setupCameraForAnimation(animationNode: Animation3DNode): void {
    const cameraConfigPath = findRecursively(animationNode, c => c.name.startsWith('cam'))
    if (cameraConfigPath == null) {
      return
    }

    const pathToPosition = (path: Animation3DNode[]) =>
      path.reduce((acc, node) => {
        if (node.translationKeys.length > 1) {
          throw new Error(`Expected at most one translation key, got ${node.translationKeys.length}`)
        }
        if (node.rotationKeys.length > 1) {
          throw new Error(`Expected at most one rotation key, got ${node.rotationKeys.length}`)
        }
        if (node.scaleKeys.length > 0) {
          throw new Error(`Scale keys found`)
        }
        if (node.morphKeys.length > 0) {
          throw new Error(`Morph keys found`)
        }
        if (node.translationKeys.length === 1) {
          if (node.translationKeys[0].timeAndFlags.time > 0) {
            throw new Error(`Translation key has time > 0`)
          }
          if (node.translationKeys[0].timeAndFlags.flags > 1) {
            throw new Error(`Translation key has flags > 1`)
          }
          acc.add(node.translationKeys[0].vertex)
        }
        if (node.rotationKeys.length === 1) {
          if (node.rotationKeys[0].timeAndFlags.time > 0) {
            throw new Error(`Rotation key has time > 0`)
          }
          if (node.rotationKeys[0].timeAndFlags.flags > 1) {
            throw new Error(`Rotation key has flags > 1`)
          }
          acc.applyQuaternion(node.rotationKeys[0].quaternion)
        }
        return acc
      }, new THREE.Vector3())

    const cameraConfig = cameraConfigPath.at(-1)
    if (cameraConfig == null) {
      throw new Error('Camera config not found')
    }

    const match = cameraConfig.name.match(/^cam(\d{2})$/)
    if (match?.[1] == null) {
      throw new Error('Camera fov not found')
    }
    this.setVerticalFOV(Number.parseInt(match[1], 10))

    this.camera.position.copy(pathToPosition(cameraConfigPath))

    const lookAtPositionPath = findRecursively(animationNode, c => c.name === 'target')
    if (lookAtPositionPath == null) {
      throw new Error('Look at position not found')
    }

    this.camera.lookAt(pathToPosition(lookAtPositionPath))
  }

  public async getActor(name: string): Promise<Actor> {
    const existing = this._actors.get(name)
    if (existing != null) {
      return existing
    }
    const actor = await Actor.create(this, name)
    this._actors.set(name, actor)
    return actor
  }

  public getObjectByNameRecursive(name: string, root: THREE.Object3D = this.scene): THREE.Object3D | null {
    let found: THREE.Object3D | null = null
    for (const child of root.children) {
      if (child.name.toLowerCase() === name.toLowerCase()) {
        if (found != null) {
          throw new Error(`Multiple objects found with name ${name}`)
        }
        found = child
      }
      const result = this.getObjectByNameRecursive(name, child)
      if (result != null) {
        if (found != null) {
          throw new Error(`Multiple objects found with name ${name}`)
        }
        found = result
      }
    }
    return found
  }

  public async playAudio(action: AudioAction): Promise<void> {
    const audio = await engine.playAudio(action)
    this._runningAudios.push(audio)
    audio.onEnded = () => {
      const index = this._runningAudios.indexOf(audio)
      if (index >= 0) {
        this._runningAudios.splice(index, 1)
      }
    }
  }

  public getObjectsByPrefix(prefix: string, root: THREE.Object3D = this.scene): THREE.Object3D[] {
    const objects: THREE.Object3D[] = []
    for (const child of root.children) {
      if (child.name === prefix || child.name.startsWith(`${prefix}_`)) {
        objects.push(child)
      }

      objects.push(...this.getObjectsByPrefix(prefix, child))
    }
    return objects
  }

  public moveObjectTo = (objects: THREE.Object3D[], targetPosition: THREE.Vector3, targetQuaternion?: THREE.Quaternion) => {
    const baseObject = objects[0]
    for (const object of objects) {
      object.updateMatrixWorld(true)
    }

    const baseWorldPosition = new THREE.Vector3()
    const baseWorldQuaternion = new THREE.Quaternion()
    baseObject.getWorldPosition(baseWorldPosition)
    baseObject.getWorldQuaternion(baseWorldQuaternion)

    const newBaseQuaternion = targetQuaternion ? targetQuaternion.clone() : baseWorldQuaternion.clone()
    const inverseBaseQuaternion = baseWorldQuaternion.clone().invert()

    const relativeTransforms = []
    for (const object of objects) {
      const worldPosition = new THREE.Vector3()
      const worldQuaternion = new THREE.Quaternion()
      object.getWorldPosition(worldPosition)
      object.getWorldQuaternion(worldQuaternion)

      worldPosition.sub(baseWorldPosition).applyQuaternion(inverseBaseQuaternion)
      worldQuaternion.premultiply(inverseBaseQuaternion)

      relativeTransforms.push({ object, relativePosition: worldPosition, relativeQuaternion: worldQuaternion })
    }

    const setWorldTransform = (object: THREE.Object3D, worldPosition: THREE.Vector3, worldQuaternion: THREE.Quaternion) => {
      const parent = object.parent
      if (parent) {
        parent.updateMatrixWorld(true)
        const parentWorldPosition = new THREE.Vector3()
        const parentWorldQuaternion = new THREE.Quaternion()
        parent.getWorldPosition(parentWorldPosition)
        parent.getWorldQuaternion(parentWorldQuaternion)
        const inverseParentQuaternion = parentWorldQuaternion.clone().invert()

        const localPosition = worldPosition.clone().sub(parentWorldPosition).applyQuaternion(inverseParentQuaternion)
        const localQuaternion = inverseParentQuaternion.clone().multiply(worldQuaternion)

        object.position.copy(localPosition)
        object.quaternion.copy(localQuaternion)
      } else {
        object.position.copy(worldPosition)
        object.quaternion.copy(worldQuaternion)
      }
      object.updateMatrix()
    }

    for (const { object, relativePosition, relativeQuaternion } of relativeTransforms) {
      const worldPosition = targetPosition.clone().add(relativePosition.clone().applyQuaternion(newBaseQuaternion))
      const worldQuaternion = newBaseQuaternion.clone().multiply(relativeQuaternion)
      setWorldTransform(object, worldPosition, worldQuaternion)
    }
  }

  public async buildAnimation(action: ParallelAction<AnimationAction | PositionalAudioAction | PhonemeAction | AudioAction> | AnimationAction, { location, extraTracks }: { location?: THREE.Vector3; extraTracks?: THREE.KeyframeTrack[] } = {}): Promise<BuiltAnimation> {
    const children = action.type === Action.Type.ParallelAction ? action.children : []
    const animationActions = action.type === Action.Type.ParallelAction ? children.filter(c => c.presenter === 'LegoAnimPresenter' || c.presenter === 'LegoLocomotionAnimPresenter') : [action]
    if (animationActions.length !== 1) {
      throw new Error('Expected one animation')
    }

    const animation = parse3DAnimation(await getAction(animationActions[0]))

    const animationActors = new Map<string, AnimationActor>()

    const addActorToList = (type: WDB.ActorType, actor: THREE.Object3D) => {
      animationActors.set(actor.name, createAnimationActor(type, actor, this.worldGroup))
    }

    for (const actor of animation.actors) {
      switch (actor.type) {
        case WDB.ActorType.Unknown: {
          const node = this.worldGroup.getObjectByName(actor.name)
          if (node == null) {
            throw new Error(`Actor not found: ${actor.name}`)
          }
          node.visible = true
          addActorToList(actor.type, node)
          break
        }
        case WDB.ActorType.ManagedActor: {
          const minifig = await this.getActor(actor.name.replace(/^\*/, ''))
          if (actor.name.startsWith('*')) {
            minifig.visible = false
          }
          this.scene.add(minifig)
          addActorToList(actor.type, minifig)
          break
        }
        case WDB.ActorType.ManagedInvisibleRoi: {
          const name = actor.name.slice(1)
          const node = this.worldGroup.getObjectByName(name)?.clone()
          if (node == null) {
            throw new Error(`Actor not found: ${name} (ManagedInvisibleRoi)`)
          }
          node.name = actor.name.toLowerCase()
          node.visible = false
          this.scene.add(node)
          addActorToList(actor.type, node)
          break
        }
        case WDB.ActorType.ManagedInvisibleRoiTrimmed: {
          const name = actor.name.slice(1).replace(/[0-9_]*$/, '')
          const node = this.worldGroup.getObjectByName(name)?.clone()
          if (node == null) {
            throw new Error(`ROI not found: ${name} (ManagedInvisibleRoiTrimmed)`)
          }
          node.name = actor.name.toLowerCase()
          node.visible = false
          this.scene.add(node)
          addActorToList(actor.type, node)
          break
        }
        case WDB.ActorType.SceneRoi1:
        case WDB.ActorType.SceneRoi2: {
          const node = (this.worldGroup.getObjectByName(actor.name) ?? (await getGlobalPart(actor.name, null, null)))?.clone()
          if (node == null) {
            throw new Error(`ROI not found: ${actor.name} (SceneRoi)`)
          }
          node.name = actor.name.toLowerCase()
          this.scene.add(node)
          addActorToList(actor.type, node)
          break
        }
        default:
          throw new Error(`Unsupported actor type ${actor.type} for ${actor.name}`)
      }
    }

    const positionalAudioActions = children.filter(c => c.presenter === 'Lego3DWavePresenter')
    const audioActions = children.filter(c => c.fileType === Action.FileType.WAV && c.presenter === null)

    const pointAtCameraObjects: THREE.Object3D[] = []
    const extra = getExtraValue(animationActions[0], 'ptatcam')
    if (extra != null) {
      for (const name of splitExtraValue(extra)) {
        const object = Array.from(animationActors.entries())
          .flatMap(([_, obj]) => Array.from(obj.children.values()))
          .find(c => c.name.toLowerCase() === name.toLowerCase())
        if (object == null) {
          throw new Error(`Object not found: ${name}`)
        }
        pointAtCameraObjects.push(object)
      }
    }

    const faceAnimations = children
      .filter(c => c.presenter === 'LegoPhonemePresenter')
      .map(phoneme => {
        if (phoneme.extra == null) {
          throw new Error('Phoneme extra is null')
        }
        const actor = this.getObjectByNameRecursive(phoneme.extra)
        if (actor == null || !(actor instanceof Actor)) {
          throw new Error(`Actor not found: ${phoneme.extra}`)
        }
        const videoElement = document.createElement('video')
        videoElement.src = getActionFileUrl(phoneme)
        const videoTexture = new THREE.VideoTexture(videoElement)
        videoTexture.colorSpace = THREE.SRGBColorSpace
        return {
          actor,
          videoElement,
          videoTexture,
          start: phoneme.startTime,
          duration: phoneme.duration,
        }
      })
      .reduce((acc, { actor, ...rest }) => {
        const existing = acc.find(a => a.actor === actor)
        if (existing == null) {
          acc.push({ actor, animations: [rest] })
        } else {
          existing.animations.push(rest)
        }
        return acc
      }, [] as FaceAnimation[])
      .map(a => ({ ...a, animations: a.animations.sort((a, b) => b.start - a.start) }))

    location ??= new THREE.Vector3(-animationActions[0].location[0], animationActions[0].location[1], animationActions[0].location[2])
    const tracks = [...animationToTracks(animation.tree, animationActors, location), ...(extraTracks ?? [])]

    if (animation.cameraAnimation != null) {
      const cameraTranslationValues: number[] = []
      const cameraTranslationTimes: number[] = []
      for (const key of animation.cameraAnimation.translationKeys) {
        if (key.timeAndFlags.flags !== 1) {
          throw new Error('Camera translation key has unsupported flags')
        }

        cameraTranslationValues.push(...new THREE.Vector3(...key.vertex).add(location).toArray())
        cameraTranslationTimes.push(key.timeAndFlags.time)
      }
      if (cameraTranslationTimes.length > 0) {
        tracks.push(new THREE.VectorKeyframeTrack('camera.position', cameraTranslationTimes, cameraTranslationValues))
      }

      const cameraZRotationValues: number[] = []
      const cameraZRotationTimes: number[] = []
      for (const key of animation.cameraAnimation.zRotationKeys) {
        cameraZRotationValues.push(key.z)
        cameraZRotationTimes.push(key.timeAndFlags.time)
      }
      if (cameraZRotationTimes.length > 0) {
        tracks.push(new THREE.NumberKeyframeTrack('camera.rotation.z', cameraZRotationTimes, cameraZRotationValues))
      }
    }
    const lookAtKeys = animation.cameraAnimation?.lookAtKeys?.map(key => ({ ...key, vertex: new THREE.Vector3(...key.vertex).add(location).toArray() }))

    return { animation, animationActors, positionalAudioActions, audioActions, tracks, lookAtKeys, faceAnimations, pointAtCameraObjects, location }
  }

  public async playAnimation(
    action: ParallelAction<AnimationAction | PositionalAudioAction | PhonemeAction | AudioAction> | AnimationAction,
    { location, unskippable, lockCamera, extraTracks }: { location?: THREE.Vector3; unskippable?: boolean; lockCamera?: boolean; extraTracks?: THREE.KeyframeTrack[] } = {},
  ): Promise<void> {
    const { animation, positionalAudioActions, audioActions, tracks, lookAtKeys, faceAnimations, pointAtCameraObjects } = await this.buildAnimation(action, { location, extraTracks })

    this.setupCameraForAnimation(animation.tree)

    for (const audio of audioActions) {
      engine.playAudio(audio)
    }

    const audios: THREE.PositionalAudio[] = await Promise.all(
      positionalAudioActions.map(async audio => {
        const actor = this.getObjectByNameRecursive(audio.extra)
        if (actor == null) {
          throw new Error(`Actor not found: ${audio.extra}`)
        }
        return this.playPositionalAudio(audio, actor instanceof Actor ? actor.head : actor, audio.startTime / 1_000)
      }),
    )

    const clip = new THREE.AnimationClip(animation.tree.name, -1, tracks)
    return this.playAnimationClip(this.scene, clip, audios, lookAtKeys, faceAnimations, pointAtCameraObjects, lockCamera, unskippable)
  }

  public async playAnimationClip(
    root: THREE.Object3D,
    clip: THREE.AnimationClip,
    audios: THREE.PositionalAudio[] = [],
    lookAtKeys?: WDB.Animation.VertexKey[],
    faceAnimations: FaceAnimation[] = [],
    pointAtCameraObjects: THREE.Object3D[] = [],
    lockCamera?: boolean,
    unskippable?: boolean,
    startAtTime?: number,
    stopAtTime?: number,
    loop?: THREE.AnimationActionLoopStyles,
  ): Promise<void> {
    if (startAtTime != null && stopAtTime != null && startAtTime > stopAtTime) {
      throw new Error(`Start (${startAtTime}) must be before stop (${stopAtTime}) when both are defined`)
    }
    const mixer = new THREE.AnimationMixer(root)
    const clipAction = mixer.clipAction(clip)
    clipAction.loop = loop ?? THREE.LoopOnce
    clipAction.clampWhenFinished = true
    clipAction.play()
    if (startAtTime != null) {
      mixer.setTime(startAtTime)
      clipAction.time = startAtTime
    }

    return new Promise(resolve => {
      const removeMe = () => {
        this._runningAnimations = this._runningAnimations.filter(a => a.mixer !== mixer)
        resolve()
      }

      this._runningAnimations.push({ mixer, clipAction, audios, resolve: removeMe, lookAtKeys, faceAnimations, pointAtCameraObjects, lockCamera, unskippable, stopAtTime })
      mixer.addEventListener('finished', removeMe)
    })
  }

  public addClickListener(objects: THREE.Object3D | THREE.Object3D[], onClick: (event: MouseEvent) => Promise<boolean>): void {
    for (const object of Array.isArray(objects) ? objects : [objects]) {
      this._clickListeners.set(object, onClick)
    }
  }

  public async click(event: MouseEvent, normalizedX: number, normalizedY: number): Promise<void> {
    this._raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), this._render.camera)
    let hit: THREE.Object3D | null = this._raycaster.intersectObjects(Array.from(this._clickListeners.keys()))[0]?.object
    while (hit != null) {
      const onClick = this._clickListeners.get(hit)
      if (hit.visible && onClick != null && (await onClick(event))) {
        break
      }
      hit = hit.parent
    }
  }

  public pointerDown(_event: MouseEvent, _normalizedX: number, _normalizedY: number): void {}
  public pointerUp(_event: MouseEvent): void {}

  public keyDown(_event: KeyboardEvent): void {}
  public keyUp(_event: KeyboardEvent): void {}

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
    for (const { mixer, resolve, lookAtKeys, faceAnimations, pointAtCameraObjects, stopAtTime } of this._runningAnimations) {
      const finishedByStopAtTime = stopAtTime != null && mixer.time + delta > stopAtTime
      if (finishedByStopAtTime) {
        mixer.update(stopAtTime - mixer.time)
      } else {
        mixer.update(delta)
      }

      if (lookAtKeys != null) {
        const { before, after } = getBeforeAndAfter(lookAtKeys, mixer.time * 1_000)
        if (before.timeAndFlags.flags !== 1) {
          throw new Error('Camera look at key has unsupported flags')
        }
        const beforePosition = new THREE.Vector3(before.vertex[0], before.vertex[1], before.vertex[2])
        if (after == null) {
          this.camera.lookAt(beforePosition)
        } else {
          if (after.timeAndFlags.flags !== 1) {
            throw new Error('Camera look at key has unsupported flags')
          }
          this.camera.lookAt(new THREE.Vector3().lerpVectors(beforePosition, new THREE.Vector3(after.vertex[0], after.vertex[1], after.vertex[2]), (mixer.time * 1_000 - before.timeAndFlags.time) / (after.timeAndFlags.time - before.timeAndFlags.time)))
        }
      }

      for (const faceAnimation of faceAnimations) {
        const currentAnimation = faceAnimation.animations.find(a => mixer.time * 1_000 >= a.start)
        if (currentAnimation == null) {
          continue
        }
        const { videoElement } = currentAnimation
        if (faceAnimation.currentVideoElement !== videoElement) {
          faceAnimation.currentVideoElement = videoElement
          faceAnimation.actor.headMaterial.map = currentAnimation.videoTexture
          faceAnimation.actor.headMaterial.needsUpdate = true
        }
        faceAnimation.currentVideoElement.currentTime = mixer.time - currentAnimation.start / 1_000
      }

      for (const object of pointAtCameraObjects) {
        const a = object.getWorldPosition(new THREE.Vector3())
        const b = this.camera.getWorldPosition(new THREE.Vector3())
        b.y = a.y
        const dir = b.clone().sub(a)
        if (dir.length() < 1e-8) {
          return
        }

        const euler = new THREE.Euler().setFromQuaternion(object.quaternion, 'YXZ')
        const targetYaw = Math.atan2(dir.x, -dir.z)
        object.quaternion.setFromEuler(new THREE.Euler(-euler.x, -targetYaw, -euler.z, 'YXZ'))
      }

      if (finishedByStopAtTime) {
        resolve()
      }
    }
  }

  public activate(composer: Composer, _param?: unknown): void {
    composer.add(this._render)
  }

  public deactivate(): void {}

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

  public keyPressed(key: string): void {
    if (key === 'd' && import.meta.env.DEV) {
      this.debugMode = !this.debugMode
    }

    if (key === 'c') {
      switch (engine.currentPlayerCharacter) {
        case 'pepper':
          engine.currentPlayerCharacter = 'papa'
          break
        case 'papa':
          engine.currentPlayerCharacter = 'mama'
          break
        case 'mama':
          engine.currentPlayerCharacter = 'nick'
          break
        case 'nick':
          engine.currentPlayerCharacter = 'laura'
          break
        case 'laura':
          engine.currentPlayerCharacter = 'pepper'
          break
      }
      console.info(`Current actor: ${engine.currentPlayerCharacter}`)
    }

    if (key === ' ') {
      this.skipAllRunningAnimations()
    }
  }

  public skipAllRunningAnimations(): void {
    for (const runningAnimation of this._runningAnimations) {
      if (runningAnimation.unskippable) {
        runningAnimation.lockCamera = false
        continue
      }

      runningAnimation.clipAction.time = runningAnimation.stopAtTime ?? runningAnimation.clipAction.getClip().duration
      for (const audio of runningAnimation.audios) {
        audio.stop()
      }
    }
    for (const runningAudio of this._runningAudios) {
      runningAudio.stop()
    }
    this._runningAudios.splice(0)
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
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(sphere, material)
    mesh.position.copy(position)
    this._debugGroup.add(mesh)
    return mesh
  }

  public debugDrawPlane(anchor: THREE.Vector3, normal: THREE.Vector3, color: string): THREE.Mesh {
    const planeGeometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
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

  public debugPrintSceneGraph(): void {
    type Graph = {
      name: string
      uuid: string
      children: Graph[]
    }

    const walk = (root: THREE.Object3D, parent: Graph) => {
      const node: Graph = {
        name: root.name,
        uuid: root.uuid,
        children: [],
      }
      for (const child of root.children) {
        walk(child, node)
      }
      parent.children.push(node)
    }

    const graph: Graph = {
      name: 'scene',
      uuid: this.scene.uuid,
      children: [],
    }
    walk(this.scene, graph)
    console.log(graph.children[0])
  }
}
