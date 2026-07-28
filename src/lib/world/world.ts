import * as THREE from 'three'
import { Action } from '../../actions/types'
import { type AnimationAction, type AudioAction, getExtraValue, isAnimationAction, isAudioAction, isNestedAnimationAction, isPositionalAudioAction, isRunAnimationAction, type NestedAnimationAction, type PositionalAudioAction, type RunAnimationAction, splitExtraValue } from '../action-types'
import { type Animation3D, type Animation3DNode, type AnimationActor, animationToTracks, findRecursively, getBeforeAndAfter, parse3DAnimation } from '../assets/animation'
import { type Audio, getPositionalAudio } from '../assets/audio'
import { getAction, getActionFileUrl } from '../assets/load'
import { calculateTransformationMatrix, getGlobalPart, Roi3D, RoiModel } from '../assets/model'
import type { SpawnLocation } from '../assets/spawn-location'
import { WDB } from '../assets/wdb'
import { type Composer, Render3D } from '../effect/composer'
import { type AudioType, engine, type NormalizedMouseEvent } from '../engine'
import type { Actor } from './actor'
import { BoundaryManager } from './boundary-manager'
import { Character, type CharacterName } from './character'

// you cannot enter the second floor
export enum ElevatorEntrance {
  First = 0,
  Third = 1,
}

export type NormalWorld = 'hospital' | 'garage' | 'regbook' | 'infodoor' | 'infoscor' | 'elevbott' | 'police' | 'polidoor' | 'garadoor' | 'copter' | 'dunecar' | 'jetski' | 'racecar' | 'elevopen' | 'seaview' | 'observe' | 'elevdown' | 'carrace' | 'act2'
export type WorldName = NormalWorld | 'act1' | 'elevride' | 'infomain'
export type WorldSpawn =
  | {
      world: NormalWorld
    }
  | {
      floor: ElevatorEntrance
    }
  | {
      spawn: SpawnLocation
    }
  | {
      ending: 'bad' | 'good' | null
    }

type FaceAnimation = {
  character: Character
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
  managedActorNames: string[]
  positionalAudioActions: PositionalAudioAction[]
  audioActions: AudioAction[]
  tracks: THREE.KeyframeTrack[]
  lookAtKeys?: WDB.Animation.VertexKey[]
  faceAnimations: FaceAnimation[]
  pointAtCameraObjects: THREE.Object3D[]
  roisToHideOnStop: Roi3D[]
  location: THREE.Vector3
  loop: THREE.AnimationActionLoopStyles
}

export abstract class World {
  protected _render = new Render3D()

  private readonly _debugGroup: THREE.Group = new THREE.Group()
  private readonly _debugBox: HTMLElement
  private readonly _debugPosition: HTMLElement
  private readonly _debugDirection: HTMLElement
  private readonly _debugTime: HTMLElement
  private readonly _debugSlewMode: HTMLElement

  private _raycaster = new THREE.Raycaster()
  private _clickListeners = new Map<THREE.Object3D, () => Promise<boolean>>()
  private _actors = new Set<Actor>()
  private _runningAnimations: {
    mixer: THREE.AnimationMixer
    clipAction: THREE.AnimationAction
    audios: THREE.PositionalAudio[]
    nonPositionalAudios: Audio[]
    resolve: () => void
    lookAtKeys?: WDB.Animation.VertexKey[]
    lockCamera?: boolean
    unskippable?: boolean
    faceAnimations: FaceAnimation[]
    pointAtCameraObjects: THREE.Object3D[]
    stopAtTime?: number
  }[] = []
  private _runningAudios: Audio[] = []
  private _characters = new Map<string, { character: Character; refCount: number }>()
  private _worldGroup: THREE.Group | null = null
  private _boundaryManager = new BoundaryManager(this)

  public get boundaryManager(): BoundaryManager {
    return this._boundaryManager
  }

  constructor(
    public readonly name: WorldName,
    public readonly ignoreEntityClick: boolean = false,
  ) {
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
    this._debugTime = getElement('debug-time')
    this._debugSlewMode = getElement('debug-slew-mode')

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

  public get camera(): THREE.PerspectiveCamera {
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
          throw new Error('Scale keys found')
        }
        if (node.morphKeys.length > 0) {
          throw new Error('Morph keys found')
        }
        if (node.translationKeys.length === 1) {
          if (node.translationKeys[0].timeAndFlags.time > 0) {
            throw new Error('Translation key has time > 0')
          }
          if (node.translationKeys[0].timeAndFlags.flags > 1) {
            throw new Error('Translation key has flags > 1')
          }
          acc.add(node.translationKeys[0].vertex)
        }
        if (node.rotationKeys.length === 1) {
          if (node.rotationKeys[0].timeAndFlags.time > 0) {
            throw new Error('Rotation key has time > 0')
          }
          if (node.rotationKeys[0].timeAndFlags.flags > 1) {
            throw new Error('Rotation key has flags > 1')
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

  public getActor<T extends Actor>(name: string, type: abstract new (...args: never[]) => T): T {
    const actor = this.getRoi(name).actor
    if (!(actor instanceof type)) {
      throw new Error(`Actor not found: ${name}`)
    }
    return actor
  }

  public async getCharacter(name: CharacterName): Promise<Character> {
    const existing = this._characters.get(name)
    if (existing != null) {
      ++existing.refCount
      return existing.character
    }
    const actor = await Character.create(this, name)
    this._characters.set(name, { character: actor, refCount: 1 })
    this.scene.add(actor.model)
    return actor
  }

  public releaseActor(name: string): void {
    const entry = this._characters.get(name)
    if (entry == null) {
      throw new Error(`Trying to release an actor that was already released: ${name}`)
    }

    --entry.refCount
    if (entry.refCount <= 0) {
      entry.character.model.removeFromParent()
      this._characters.delete(name)
    }
  }

  public async playAudio(action: AudioAction, audioType: AudioType): Promise<void> {
    const audio = await engine.playAudio(action, audioType)
    this._runningAudios.push(audio)
    audio.onEnded = () => {
      const index = this._runningAudios.indexOf(audio)
      if (index >= 0) {
        this._runningAudios.splice(index, 1)
      }
    }
  }

  public findRoi(name: string): Roi3D | null {
    const lowerName = name.toLowerCase()
    let found: Roi3D | null = null
    this.scene.traverse(object => {
      if (found == null && object instanceof RoiModel) {
        const roi3d = object.roi3dOrNull
        if (roi3d != null && roi3d.name === lowerName) {
          found = roi3d
        }
      }
    })
    return found
  }

  public getRoi(name: string): Roi3D {
    const roi = this.findRoi(name)
    if (roi == null) {
      throw new Error(`ROI not found: ${name}`)
    }
    return roi
  }

  public async registerActor(actor: Actor): Promise<void> {
    await actor.init()
    this._actors.add(actor)
    this.addClickListener(actor.roi, async () => {
      if (!this.ignoreEntityClick) {
        return await actor.onClick()
      }
      return false
    })
  }

  public removeActor(actor: Actor): void {
    this._actors.delete(actor)
  }

  public async updateActors(delta: number, playerFrom: THREE.Vector3, playerTo: THREE.Vector3): Promise<void> {
    for (const actor of this._actors) {
      const result = actor.update(delta)
      if (actor.checkCollision(playerFrom, playerTo)) {
        actor.onCollision(null)
      }
      if (result == null) {
        continue
      }
      const { from: actorFrom, to: actorTo } = result
      for (const actor of this._actors) {
        if (actor.checkCollision(actorFrom, actorTo)) {
          actor.onCollision(actor.roi)
        }
      }
      this.boundaryManager.update(actorFrom, actorTo, actor.roi)
    }
  }

  public async resolveAnimationActors(animation: Animation3D): Promise<{ animationActors: Map<string, AnimationActor>; managedActorNames: string[] }> {
    const animationActors = new Map<string, AnimationActor>()
    const managedActorNames: string[] = []

    const addActorToList = (type: WDB.ActorType, actor: Roi3D) => {
      animationActors.set(actor.name, {
        type,
        object: actor.model,
        children: new Map(actor.children.map(c => [c.name, c.model])),
        roi: actor,
      })
    }

    for (const actor of animation.actors) {
      switch (actor.type) {
        case WDB.ActorType.Unknown: {
          const node = this.getRoi(actor.name)
          node.visible = true
          addActorToList(actor.type, node)
          break
        }
        case WDB.ActorType.ManagedActor: {
          const actorName = actor.name.replace(/^\*/, '')
          const minifig = await this.getCharacter(actorName as CharacterName)
          managedActorNames.push(actorName)
          if (actor.name.startsWith('*')) {
            minifig.visible = false
          }
          addActorToList(actor.type, minifig)
          break
        }
        case WDB.ActorType.ManagedInvisibleRoi: {
          const name = actor.name.slice(1)
          const node = this.getRoi(name).clone()
          node.name = actor.name.toLowerCase()
          node.visible = false
          this.scene.add(node.model)
          addActorToList(actor.type, node)
          break
        }
        case WDB.ActorType.ManagedInvisibleRoiTrimmed: {
          const name = actor.name.slice(1).replace(/[0-9_]*$/, '')
          const node = this.getRoi(name).clone()
          node.name = actor.name.toLowerCase()
          node.visible = false
          this.scene.add(node.model)
          addActorToList(actor.type, node)
          break
        }
        case WDB.ActorType.SceneRoi1:
        case WDB.ActorType.SceneRoi2: {
          const name = actor.name.replace(/[0-9_]*$/, '')
          const node = (this.findRoi(name) ?? (await getGlobalPart(name, null, null))).clone()
          node.name = actor.name.toLowerCase()
          this.scene.add(node.model)
          addActorToList(actor.type, node)
          break
        }
        default:
          throw new Error(`Unsupported actor type ${actor.type} for ${actor.name}`)
      }
    }

    return { animationActors, managedActorNames }
  }

  public async buildAnimation(action: RunAnimationAction | NestedAnimationAction | AnimationAction, { location, rotation, extraTracks }: { location?: THREE.Vector3; rotation?: THREE.Quaternion; extraTracks?: THREE.KeyframeTrack[] } = {}): Promise<BuiltAnimation> {
    const children = action.type === Action.Type.ParallelAction ? action.children : []
    const animationActions = action.type === Action.Type.ParallelAction ? children.filter(c => c.presenter === 'LegoAnimPresenter' || c.presenter === 'LegoLocomotionAnimPresenter' || c.presenter === 'LegoLoopingAnimPresenter') : [action]
    if (animationActions.length !== 1) {
      throw new Error(`Expected exactly one animation, got ${animationActions.length}`)
    }

    const animationAction = animationActions[0]
    if (!isAnimationAction(animationAction)) {
      throw new Error(`Expected animation action, got ${animationAction.type}`)
    }

    const animation = parse3DAnimation(await getAction(animationAction))

    const { animationActors, managedActorNames } = await this.resolveAnimationActors(animation)

    const positionalAudioActions = children.filter(c => isPositionalAudioAction(c))
    const audioActions = children.filter(c => isAudioAction(c))

    const pointAtCameraObjects: THREE.Object3D[] = []
    const extra = getExtraValue(animationAction, 'ptatcam')
    if (extra != null) {
      for (const name of splitExtraValue(extra)) {
        const object = Array.from(animationActors.entries())
          .flatMap(([_, obj]) => Array.from(obj.children.values()))
          .find(c => c.name.toLowerCase() === name.toLowerCase())
        if (object == null) {
          console.warn(`PTATCAM: Object not found: ${name}`)
          continue
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
        const character = this.getRoi(phoneme.extra)
        if (character == null || !(character instanceof Character)) {
          throw new Error(`Actor not found: ${phoneme.extra}`)
        }
        const videoElement = document.createElement('video')
        videoElement.src = getActionFileUrl(phoneme)
        const videoTexture = new THREE.VideoTexture(videoElement)
        videoTexture.colorSpace = THREE.SRGBColorSpace
        return {
          character,
          videoElement,
          videoTexture,
          start: phoneme.startTime,
          duration: phoneme.duration,
        }
      })
      .reduce((acc, { character, ...rest }) => {
        const existing = acc.find(a => a.character === character)
        if (existing == null) {
          acc.push({ character, animations: [rest] })
        } else {
          existing.animations.push(rest)
        }
        return acc
      }, [] as FaceAnimation[])
      .map(a => ({ ...a, animations: a.animations.sort((a, b) => b.start - a.start) }))

    const animationTransform = new THREE.Matrix4()
    calculateTransformationMatrix([-animationAction.location[0], animationAction.location[1], animationAction.location[2]], [-animationAction.direction[0], animationAction.direction[1], animationAction.direction[2]], [-animationAction.up[0], animationAction.up[1], animationAction.up[2]], animationTransform)

    if (rotation != null) {
      animationTransform.makeRotationFromQuaternion(rotation)
    }

    if (location != null) {
      animationTransform.setPosition(location)
    }

    const tracks = [...animationToTracks(animation.tree, animationActors, animationTransform), ...(extraTracks ?? [])]

    if (animation.cameraAnimation != null) {
      const cameraTranslationValues: number[] = []
      const cameraTranslationTimes: number[] = []
      for (const key of animation.cameraAnimation.translationKeys) {
        if (key.timeAndFlags.flags !== 1) {
          throw new Error('Camera translation key has unsupported flags')
        }

        cameraTranslationValues.push(...new THREE.Vector3(...key.vertex).applyMatrix4(animationTransform).toArray())
        cameraTranslationTimes.push(key.timeAndFlags.time / 1000)
      }
      if (cameraTranslationTimes.length > 0) {
        tracks.push(new THREE.VectorKeyframeTrack('camera.position', cameraTranslationTimes, cameraTranslationValues))
      }

      const cameraZRotationValues: number[] = []
      const cameraZRotationTimes: number[] = []
      for (const key of animation.cameraAnimation.zRotationKeys) {
        cameraZRotationValues.push(key.z)
        cameraZRotationTimes.push(key.timeAndFlags.time / 1000)
      }
      if (cameraZRotationTimes.length > 0) {
        tracks.push(new THREE.NumberKeyframeTrack('camera.rotation.z', cameraZRotationTimes, cameraZRotationValues))
      }
    }
    const lookAtKeys = animation.cameraAnimation?.lookAtKeys?.map(key => ({ ...key, vertex: new THREE.Vector3(...key.vertex).applyMatrix4(animationTransform).toArray() }))

    location = new THREE.Vector3()
    animationTransform.decompose(location, new THREE.Quaternion(), new THREE.Vector3())

    const roisToHideOnStop = getExtraValue(animationAction, 'hide_on_stop') != null ? Array.from(animationActors.values()).map(actor => actor.roi) : []

    return {
      animation,
      animationActors,
      managedActorNames,
      positionalAudioActions,
      audioActions,
      tracks,
      lookAtKeys,
      faceAnimations,
      pointAtCameraObjects,
      roisToHideOnStop,
      location,
      loop: animationAction.presenter === 'LegoLoopingAnimPresenter' || animationAction.presenter === 'LegoLocomotionAnimPresenter' ? THREE.LoopRepeat : THREE.LoopOnce,
    }
  }

  public async playAnimation(
    action: RunAnimationAction | NestedAnimationAction | AnimationAction,
    { location, rotation, unskippable, lockCamera, extraTracks, overrideLoop }: { location?: THREE.Vector3; rotation?: THREE.Quaternion; unskippable?: boolean; lockCamera?: boolean; extraTracks?: THREE.KeyframeTrack[]; overrideLoop?: THREE.AnimationActionLoopStyles } = {},
  ): Promise<void> {
    const animationAction = isRunAnimationAction(action) || isNestedAnimationAction(action) ? [...action.children].find((c): c is AnimationAction => isAnimationAction(c)) : action
    if (animationAction == null) {
      throw new Error('No AnimationAction found')
    }
    const directionRotation = new THREE.Quaternion()
    calculateTransformationMatrix([0, 0, 0], [-animationAction.direction[0], animationAction.direction[1], animationAction.direction[2]], [-animationAction.up[0], animationAction.up[1], animationAction.up[2]]).decompose(new THREE.Vector3(), directionRotation, new THREE.Vector3())
    if (rotation != null) {
      directionRotation.multiply(rotation)
    }
    console.log(animationAction)
    const {
      animation,
      managedActorNames,
      positionalAudioActions,
      audioActions,
      tracks,
      lookAtKeys,
      faceAnimations,
      pointAtCameraObjects,
      roisToHideOnStop,
      loop: defaultLoop,
    } = await this.buildAnimation(action, { location: new THREE.Vector3(-animationAction.location[0], animationAction.location[1], animationAction.location[2]).add(location ?? new THREE.Vector3()), rotation: directionRotation, extraTracks })
    const loop = overrideLoop ?? defaultLoop

    this.setupCameraForAnimation(animation.tree)

    const nonPositionalAudios = await Promise.all(audioActions.map(audio => engine.playAudio(audio, 'animations')))

    const audios: THREE.PositionalAudio[] = await Promise.all(
      positionalAudioActions.map(async audio => {
        const character = this.getRoi(audio.extra)
        if (character == null) {
          throw new Error(`Actor not found: ${audio.extra}`)
        }
        return this.playPositionalAudio(audio, character instanceof Character ? character.head.model : character.model, audio.startTime / 1_000)
      }),
    )
    const sentinel = audioActions.length > 0 || audios.length > 0 ? engine.lowerBackgroundMusic() : null

    const clip = new THREE.AnimationClip(animation.tree.name, -1, tracks)
    await this.playAnimationClip(this.scene, clip, { audios, nonPositionalAudios, lookAtKeys, faceAnimations, pointAtCameraObjects, roisToHideOnStop, managedActorNames, lockCamera, unskippable, loop })
    if (sentinel != null) {
      engine.raiseBackgroundMusic(sentinel)
    }
  }

  public async playAnimationClip(
    root: THREE.Object3D,
    clip: THREE.AnimationClip,
    {
      audios = [],
      nonPositionalAudios = [],
      lookAtKeys,
      faceAnimations = [],
      pointAtCameraObjects = [],
      roisToHideOnStop = [],
      managedActorNames = [],
      lockCamera,
      unskippable,
      startAtTime = 0,
      stopAtTime,
      loop,
    }: {
      audios?: THREE.PositionalAudio[]
      nonPositionalAudios?: Audio[]
      lookAtKeys?: WDB.Animation.VertexKey[]
      faceAnimations?: FaceAnimation[]
      pointAtCameraObjects?: THREE.Object3D[]
      roisToHideOnStop?: Roi3D[]
      managedActorNames?: string[]
      lockCamera?: boolean
      unskippable?: boolean
      startAtTime?: number
      stopAtTime?: number
      loop?: THREE.AnimationActionLoopStyles
    } = {},
  ): Promise<void> {
    if (stopAtTime != null && startAtTime > stopAtTime) {
      throw new Error(`Start (${startAtTime}) must be before stop (${stopAtTime}) when both are defined`)
    }
    const mixer = new THREE.AnimationMixer(root)
    const clipAction = mixer.clipAction(clip)
    clipAction.loop = loop ?? THREE.LoopOnce
    clipAction.clampWhenFinished = true
    clipAction.play()
    if (startAtTime > 0) {
      mixer.setTime(startAtTime)
      clipAction.time = startAtTime
    }

    return new Promise(resolve => {
      const removeMe = () => {
        for (const faceAnimation of faceAnimations) {
          faceAnimation.character.resetHeadTexture()
        }
        for (const roi of roisToHideOnStop) {
          roi.visible = false
        }
        for (const actorName of managedActorNames) {
          this.releaseActor(actorName)
        }
        this._runningAnimations = this._runningAnimations.filter(a => a.mixer !== mixer)
        resolve()
      }

      this._runningAnimations.push({ mixer, clipAction, audios, nonPositionalAudios, resolve: removeMe, lookAtKeys, faceAnimations, pointAtCameraObjects, lockCamera, unskippable, stopAtTime })
      mixer.addEventListener('finished', removeMe)
    })
  }

  public removeFromParents(objects: THREE.Object3D | THREE.Object3D[]): void {
    for (const object of Array.isArray(objects) ? objects : [objects]) {
      this._clickListeners.delete(object)
      object.removeFromParent()
    }
  }

  public addClickListener(objects: Roi3D | THREE.Object3D | THREE.Object3D[], onClick: () => Promise<boolean>): void {
    if (objects instanceof RoiModel) {
      throw new Error(`RoiModel ${objects.name} should not be added a click listener`)
    }
    if (objects instanceof Roi3D) {
      objects = objects.getAllModels()
    }

    for (const object of Array.isArray(objects) ? objects : [objects]) {
      this._clickListeners.set(object, onClick)
    }
  }

  public async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    this._raycaster.setFromCamera(new THREE.Vector2(event.normalizedX, event.normalizedY), this._render.camera)
    let hit: THREE.Object3D | null = this._raycaster.intersectObjects(Array.from(this._clickListeners.keys()))[0]?.object
    while (hit != null) {
      const onClick = this._clickListeners.get(hit)
      if (hit.visible && onClick != null && (await onClick())) {
        break
      }
      hit = hit.parent
    }
  }

  public pickRoiNameAt(normalizedX: number, normalizedY: number, names: Set<string>): string | null {
    this._raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), this._render.camera)
    const hits = this._raycaster.intersectObjects(Array.from(this._clickListeners.keys()))
    for (const hit of hits) {
      if (!hit.object.visible) {
        continue
      }
      let obj: THREE.Object3D | null = hit.object
      while (obj != null) {
        const match = obj instanceof RoiModel ? (obj.roi3dOrNull?.name ?? obj.name) : obj.name
        if (match != null && names.has(match)) {
          return match
        }
        obj = obj.parent
      }
      return null
    }
    return null
  }
  public pointerUp(_event: NormalizedMouseEvent): void {}
  public pointerMove(_event: NormalizedMouseEvent): void {}

  public keyDown(_event: KeyboardEvent): void {}
  public keyUp(_event: KeyboardEvent): void {}

  protected get debugPositionDirection(): { position: THREE.Vector3; direction: THREE.Vector3; slewMode: boolean } | null {
    return null
  }

  protected get debugTime(): number | null {
    return null
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

  public updateWorld(delta: number): void {
    this.update(delta)

    this._debugGroup.visible = engine.debugMode
    this._debugBox.classList.toggle('hidden', !engine.debugMode)

    const positionDirection = this.debugPositionDirection
    const time = this.debugTime
    this._debugPosition.parentElement?.classList.toggle('hidden', positionDirection == null)
    this._debugDirection.parentElement?.classList.toggle('hidden', positionDirection == null)
    if (positionDirection != null) {
      const { position, direction } = positionDirection
      this._debugPosition.textContent = `x: ${position.x.toFixed(4)}, y: ${position.y.toFixed(4)}, z: ${position.z.toFixed(4)}`
      this._debugDirection.textContent = `x: ${direction.x.toFixed(4)}, y: ${direction.y.toFixed(4)}, z: ${direction.z.toFixed(4)}`
    }
    this._debugTime.parentElement?.classList.toggle('hidden', time == null)
    if (time != null) {
      const hours = time * 12 + 6
      const minutes = (hours * 60) % 60
      this._debugTime.textContent = `${Math.floor(hours).toFixed(0).padStart(2, '0')}:${Math.floor(minutes).toFixed(0).padStart(2, '0')}`
    }
    this._debugSlewMode.classList.toggle('hidden', positionDirection == null || !positionDirection.slewMode)
  }

  protected update(delta: number): void {
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
          faceAnimation.character.headMaterial.map = currentAnimation.videoTexture
          faceAnimation.character.headMaterial.needsUpdate = true
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

  private readonly _cachedPositionalAudios = new Map<string, Promise<THREE.PositionalAudio>>()

  public async cachePositionalAudio(action: PositionalAudioAction): Promise<void> {
    this._cachedPositionalAudios.set((action.filename.split(/[\\/]/).pop() ?? '').replace(/\.wav$/i, '').toLowerCase(), getPositionalAudio(engine.audioListener, action))
  }

  public async playPositionalAudio(action: PositionalAudioAction | string, parent: THREE.Object3D, delay?: number): Promise<THREE.PositionalAudio> {
    const audio = await (typeof action === 'string' ? (await this._cachedPositionalAudios.get(action))?.clone() : getPositionalAudio(engine.audioListener, action))
    if (audio == null) {
      throw new Error(`Positional audio not found: ${action}`)
    }
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
      engine.debugMode = !engine.debugMode
    }

    if (key === 'c') {
      switch (engine.currentSaveGame.player) {
        case 'pepper':
          engine.currentSaveGame.player = 'papa'
          break
        case 'papa':
          engine.currentSaveGame.player = 'mama'
          break
        case 'mama':
          engine.currentSaveGame.player = 'nick'
          break
        case 'nick':
          engine.currentSaveGame.player = 'laura'
          break
        default:
          engine.currentSaveGame.player = 'pepper'
          break
      }
      console.info(`Current actor: ${engine.currentSaveGame.player}`)
    }

    if (key === ' ') {
      this.skipAllRunningAnimations()
    }

    if (key === 'p') {
      this.skipAllRunningAnimations(true)
    }
  }

  public skipAllRunningAnimations(force = false): void {
    for (const runningAnimation of this._runningAnimations) {
      if (runningAnimation.unskippable && !force) {
        runningAnimation.lockCamera = false
        continue
      }

      if (runningAnimation.clipAction.loop === THREE.LoopOnce) {
        runningAnimation.clipAction.time = runningAnimation.stopAtTime ?? runningAnimation.clipAction.getClip().duration
      } else {
        runningAnimation.resolve()
      }

      for (const audio of runningAnimation.audios) {
        audio.stop()
      }
      for (const audio of runningAnimation.nonPositionalAudios) {
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

  public debugDrawBox(box: THREE.Box3, color: string): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z)
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(box.getCenter(new THREE.Vector3()))
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

  public debugDrawDebugMesh(mesh: THREE.Mesh, color = '#00ff00'): void {
    mesh.material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
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
