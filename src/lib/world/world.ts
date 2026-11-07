import * as THREE from 'three'
import { Action } from '../../actions/types'
import { type AnimationAction, type AudioAction, getExtraValue, isAnimationAction, isAudioAction, isNestedAnimationAction, isPositionalAudioAction, isRunAnimationAction, type NestedAnimationAction, type PositionalAudioAction, type RunAnimationAction, splitExtraValue } from '../action-types'
import { type ManagedAnimation, skipDecision } from '../animation-skip.ts'
import { type Animation3D, type Animation3DNode, type AnimationActor, animationToTracks, findRecursively, getBeforeAndAfter, getTransformsAtTime, parse3DAnimation } from '../assets/animation'
import type { Audio } from '../assets/audio'
import { getAction, getActionFileUrl } from '../assets/load'
import { calculateTransformationMatrix, getGlobalPart, Roi3D, RoiModel } from '../assets/model'
import type { SpawnLocation } from '../assets/spawn-location'
import { WDB } from '../assets/wdb'
import { type Composer, Render3D } from '../effect/composer'
import { type AudioType, engine, type NormalizedMouseEvent } from '../engine'
import { Actor, ColliderType } from './actor'
import { BoundaryManager } from './boundary-manager'
import { Character, type CharacterName } from './character'
import { CollisionResolver, type SphereCollider } from './collision'
import type { PlayerMovement } from './player-movement'

const _ptatcamAnimWorld = new THREE.Matrix4()
const _ptatcamLocal = new THREE.Matrix4()
const _ptatcamUp = new THREE.Vector3()
const _ptatcamTrans = new THREE.Vector3()
const _ptatcamToCam = new THREE.Vector3()
const _ptatcamRight = new THREE.Vector3()
const _ptatcamForward = new THREE.Vector3()
const _ptatcamCol = new THREE.Vector3()
const _ptatcamBasis = new THREE.Matrix4()

const PLAYER_COLLISION_RADIUS = 0
const MAX_SHOVE_VELOCITY = 40
const COLLISION_EPSILON = 1e-4
const _shoveVel = new THREE.Vector3()
const _segAb = new THREE.Vector3()
const _segAp = new THREE.Vector3()

const distanceSquaredPointSegment = (point: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number => {
  _segAb.copy(b).sub(a)
  const abLenSq = _segAb.lengthSq()
  if (abLenSq < 1e-12) {
    return point.distanceToSquared(a)
  }
  const t = Math.min(1, Math.max(0, _segAp.copy(point).sub(a).dot(_segAb) / abLenSq))
  return _segAp.copy(a).addScaledVector(_segAb, t).distanceToSquared(point)
}

// you cannot enter the second floor
export enum ElevatorEntrance {
  First = 0,
  Third = 1,
}

export type NormalWorld = 'jetrace' | 'credits' | 'histbook' | 'hospital' | 'garage' | 'regbook' | 'infodoor' | 'infoscor' | 'elevbott' | 'police' | 'polidoor' | 'garadoor' | 'copter' | 'dunecar' | 'jetski' | 'racecar' | 'elevopen' | 'seaview' | 'observe' | 'elevdown' | 'carrace' | 'act2' | 'jukeboxw'
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
  rootTransform: THREE.Matrix4
  managedActorNames: string[]
  roisToRemoveOnStop: Roi3D[]
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
  public fixedAspectRatio = false

  private readonly _debugGroup: THREE.Group = new THREE.Group()
  private readonly _debugBox: HTMLElement
  private readonly _debugPosition: HTMLElement
  private readonly _debugDirection: HTMLElement
  private readonly _debugTime: HTMLElement
  private readonly _debugSlewMode: HTMLElement
  private readonly _debugSaveGame: HTMLElement
  private readonly _debugPlayer: HTMLElement

  private _raycaster = new THREE.Raycaster()
  private _clickListeners = new Map<THREE.Object3D, () => Promise<boolean>>()
  private _actors = new Set<Actor>()
  private _runningAnimations: {
    metadata: ManagedAnimation
    onRelease?: () => void
    action?: { id: number; siFile: string }
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
    managedActorNames?: readonly string[]
    collisionRois?: Roi3D[]
    collisionCenter?: THREE.Vector3
    collisionRadius?: number
  }[] = []
  private _collision = new CollisionResolver()

  protected get playerMovement(): PlayerMovement | null {
    return null
  }

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
    this._debugSaveGame = getElement('debug-save-game')
    this._debugPlayer = getElement('debug-player')

    this._render.scene.add(this._debugGroup)
  }

  public get isRunningCameraAnimation(): boolean {
    return this._runningAnimations.some(a => !a.metadata.released && (a.lookAtKeys != null || a.lockCamera === true || a.metadata.hasCameraTrack))
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

  public resumeHeldActor(name: string): void {
    this.findRoi(name)?.actor?.resume()
  }

  public get hasRunningAnimations(): boolean {
    return this._runningAnimations.length > 0
  }

  public isCharacterAnimating(name: string): boolean {
    return this._runningAnimations.some(animation => animation.managedActorNames?.includes(name))
  }

  public characterExists(name: string): boolean {
    return this._characters.has(name)
  }

  public characterRefCount(name: string): number {
    return this._characters.get(name)?.refCount ?? 0
  }

  public isBoxInFrustum(box: THREE.Box3): boolean {
    this.camera.updateMatrixWorld()
    return new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse)).intersectsBox(box)
  }

  public attachActor(actor: Actor): void {
    this._actors.add(actor)
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
    if (actor.roi instanceof Character) {
      return
    }
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

  protected get actors(): readonly Actor[] {
    return [...this._actors]
  }

  protected onActorMoved(_actor: Actor, _from: THREE.Vector3, _to: THREE.Vector3): void {}

  public async updateActors(delta: number, playerFrom: THREE.Vector3, playerTo: THREE.Vector3): Promise<void> {
    for (const actor of this._actors) {
      if (actor.suspended) {
        continue
      }
      if (!actor.collisionEnabled) {
        actor.update(delta)
        continue
      }
      const actorQuaternion = actor.roi.getWorldQuaternion()
      const result = actor.update(delta)
      if (result == null) {
        continue
      }
      const { from: actorFrom, to: actorTo } = result
      const moverRadius = actor.roi.model.getWorldBoundingSphere().radius
      let collided = this._checkAnimatedCollisions(actorFrom, actorTo, actor.roi, moverRadius)
      if (!collided) {
        const moverCollideBox = actor.colliderType === ColliderType.Box
        for (const other of this._actors) {
          if (other === actor || !other.collisionEnabled || !other.checkCollision(actorFrom, actorTo, moverCollideBox)) {
            continue
          }
          actor.onCollision(other.roi)
          other.onCollision(actor.roi)
          collided = true
          break
        }
      }
      if (collided) {
        actor.roi.moveRoiTo(actorFrom, actorQuaternion)
        this.boundaryManager.update(actorFrom, actorFrom, actor.roi)
        continue
      }
      this.onActorMoved(actor, actorFrom, actorTo)
      this.boundaryManager.update(actorFrom, actorTo, actor.roi)
    }

    if (this.isRunningCameraAnimation) {
      return
    }

    const contacts = new Set<Roi3D>()
    const colliders = this._collectPlayerColliders(playerFrom, playerTo)
    const glided = this._collision.collideAndGlide(playerFrom, playerTo, PLAYER_COLLISION_RADIUS, colliders, contacts)
    const push = this._collision.resolvePenetration(glided, PLAYER_COLLISION_RADIUS, colliders, contacts)

    for (const roi of contacts) {
      roi.actor?.onCollision(null)
    }

    const pushVec = _shoveVel.set(push.x, 0, push.z)
    const finalPos = this.playerMovement != null && pushVec.lengthSq() > 0 ? this.playerMovement.constrainDisplacement(glided, pushVec) : glided.add(push)
    this.camera.position.x = finalPos.x
    this.camera.position.z = finalPos.z
    playerTo.copy(this.camera.position)

    if (push.lengthSq() > COLLISION_EPSILON) {
      _shoveVel.set(push.x, 0, push.z).divideScalar(Math.max(delta, 1 / 120))
      if (_shoveVel.lengthSq() > MAX_SHOVE_VELOCITY * MAX_SHOVE_VELOCITY) {
        _shoveVel.setLength(MAX_SHOVE_VELOCITY)
      }
      this.playerMovement?.applyExternalVelocity(_shoveVel)
    }
  }

  private _collectPlayerColliders(from: THREE.Vector3, to: THREE.Vector3): SphereCollider[] {
    const colliders: SphereCollider[] = []
    for (const actor of this._actors) {
      if (actor.suspended) {
        continue
      }
      if (!actor.collisionEnabled) {
        continue
      }
      const sphere = actor.roi.model.getWorldBoundingSphere()
      colliders.push({ center: sphere.center, radius: sphere.radius, dynamic: true, roi: actor.roi })
    }
    for (const { collisionRois, collisionCenter, collisionRadius } of this._runningAnimations) {
      if (collisionRois == null || collisionCenter == null || collisionRadius == null) {
        continue
      }
      const reach = collisionRadius + PLAYER_COLLISION_RADIUS
      if (distanceSquaredPointSegment(collisionCenter, from, to) > reach * reach) {
        continue
      }
      for (const roi of collisionRois) {
        if (!roi.model.visible) {
          continue
        }
        const sphere = roi.model.getWorldBoundingSphere()
        colliders.push({ center: sphere.center, radius: sphere.radius, dynamic: true, roi })
      }
    }
    return colliders
  }

  private _checkAnimatedCollisions(from: THREE.Vector3, to: THREE.Vector3, mover: Roi3D | null, moverRadius: number): boolean {
    const moverRois = new Set(mover?.getAllRois() ?? [])
    for (const { collisionRois, collisionCenter, collisionRadius } of this._runningAnimations) {
      if (collisionRois == null || collisionCenter == null || collisionRadius == null) {
        continue
      }
      const reach = collisionRadius + moverRadius
      if (distanceSquaredPointSegment(collisionCenter, from, to) > reach * reach) {
        continue
      }
      for (const roi of collisionRois) {
        if (!moverRois.has(roi) && Actor.intersectRoi(from, to, roi)) {
          return true
        }
      }
    }
    return false
  }

  public async resolveAnimationActors(animation: Animation3D, substitutions: ReadonlyMap<string, string> = new Map()): Promise<{ animationActors: Map<string, AnimationActor>; managedActorNames: string[]; roisToRemoveOnStop: Roi3D[] }> {
    const animationActors = new Map<string, AnimationActor>()
    const managedActorNames: string[] = []
    const roisToRemoveOnStop: Roi3D[] = []

    const addActorToList = (type: WDB.ActorType, actor: Roi3D, name = actor.name) => {
      animationActors.set(name, {
        type,
        object: actor.model,
        children: new Map(actor.children.map(c => [c.name, c.model])),
        roi: actor,
      })
    }

    for (const actor of animation.actors) {
      const substitute = substitutions.get(actor.name.toLowerCase())
      if (substitute != null) {
        const roi = this.getRoi(substitute)
        roi.visible = true
        addActorToList(actor.type ?? WDB.ActorType.Unknown, roi, actor.name)
        continue
      }
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
          roisToRemoveOnStop.push(node)
          addActorToList(actor.type, node)
          break
        }
        case WDB.ActorType.ManagedInvisibleRoiTrimmed: {
          const name = actor.name.slice(1).replace(/[0-9_]*$/, '')
          const node = this.getRoi(name).clone()
          node.name = actor.name.toLowerCase()
          node.visible = false
          this.scene.add(node.model)
          roisToRemoveOnStop.push(node)
          addActorToList(actor.type, node)
          break
        }
        case WDB.ActorType.SceneRoi1:
        case WDB.ActorType.SceneRoi2: {
          const existing = this.findRoi(actor.name)
          if (existing != null) {
            addActorToList(actor.type, existing)
            break
          }
          const name = actor.name.replace(/[0-9_]*$/, '')
          const node = (this.findRoi(name) ?? (await getGlobalPart(name, null, null))).clone()
          node.name = actor.name.toLowerCase()
          this.scene.add(node.model)
          roisToRemoveOnStop.push(node)
          addActorToList(actor.type, node)
          break
        }
        default:
          throw new Error(`Unsupported actor type ${actor.type} for ${actor.name}`)
      }
    }

    return { animationActors, managedActorNames, roisToRemoveOnStop }
  }

  public async buildAnimation(action: RunAnimationAction | NestedAnimationAction | AnimationAction, { location, rotation, extraTracks, anchorRoi }: { location?: THREE.Vector3; rotation?: THREE.Quaternion; extraTracks?: THREE.KeyframeTrack[]; anchorRoi?: Roi3D } = {}): Promise<BuiltAnimation> {
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

    const substitution = getExtraValue(animationAction, 'subst')
    const parts = substitution != null ? splitExtraValue(substitution) : []
    const substitutions = new Map<string, string>()
    for (let n = 0; n + 1 < parts.length; n += 2) {
      substitutions.set(parts[n].toLowerCase(), parts[n + 1].toLowerCase())
    }
    const { animationActors, managedActorNames, roisToRemoveOnStop } = await this.resolveAnimationActors(animation, substitutions)

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
        object.matrixWorldAutoUpdate = false
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
        videoElement.muted = true
        videoElement.playsInline = true
        videoElement.preload = 'auto'
        videoElement.src = getActionFileUrl(phoneme)
        videoElement.load()
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

    if (anchorRoi != null) {
      const actor = [...animationActors.values()].find(actor => actor.roi === anchorRoi)
      if (actor != null) {
        const bindings = new Map([...animationActors].map(([name, entry]) => [name, entry === actor ? { ...entry, type: WDB.ActorType.Unknown } : entry]))
        const transform = getTransformsAtTime(animation.tree, bindings, new THREE.Matrix4(), 0).get(anchorRoi.model.uuid)
        if (transform != null) {
          animationTransform.copy(anchorRoi.getWorldBoundsMatrix()).multiply(new THREE.Matrix4().compose(transform.position, transform.quaternion, transform.scale).invert())
        }
      }
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
      rootTransform: animationTransform,
      managedActorNames,
      roisToRemoveOnStop,
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
    {
      location,
      rotation,
      unskippable,
      lockCamera,
      extraTracks,
      overrideLoop,
      signal,
      holdManagedActorNames,
      anchorRoi,
      managed = false,
      capturesPlayer = false,
      animationLocation = -1,
    }: {
      managed?: boolean
      capturesPlayer?: boolean
      animationLocation?: number
      location?: THREE.Vector3
      rotation?: THREE.Quaternion
      unskippable?: boolean
      lockCamera?: boolean
      extraTracks?: THREE.KeyframeTrack[]
      overrideLoop?: THREE.AnimationActionLoopStyles
      signal?: AbortSignal
      holdManagedActorNames?: readonly string[]
      anchorRoi?: Roi3D
    } = {},
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
    const {
      animation,
      managedActorNames,
      roisToRemoveOnStop,
      positionalAudioActions,
      audioActions,
      tracks,
      lookAtKeys,
      faceAnimations,
      pointAtCameraObjects,
      roisToHideOnStop,
      loop: defaultLoop,
      animationActors,
      rootTransform,
      location: builtLocation,
    } = await this.buildAnimation(action, { location: new THREE.Vector3(-animationAction.location[0], animationAction.location[1], animationAction.location[2]).add(location ?? new THREE.Vector3()), rotation: directionRotation, extraTracks, anchorRoi })
    if (signal?.aborted) {
      for (const name of managedActorNames) {
        this.releaseActor(name)
      }
      return
    }
    const loop = overrideLoop ?? defaultLoop
    const collisionRois = [...new Set([...animationActors.values()].flatMap(actor => actor.roi.getAllRois()))].filter(roi => roi.model.hasLod)
    const collisionCenter = new THREE.Vector3(...animation.center).add(builtLocation)
    const collisionRadius = animation.radius

    this.setupCameraForAnimation(animation.tree)

    const nonPositionalAudios = await Promise.all(audioActions.map(audio => engine.playAudio(audio, 'animations')))

    const audios: THREE.PositionalAudio[] = await Promise.all(
      positionalAudioActions.map(async audio => {
        const extra = audio.extra === 'FROM_PARENT' ? action.extra : audio.extra
        const character = this.getRoi(extra ?? '')
        if (character == null) {
          throw new Error(`Actor not found: ${audio.extra}`)
        }
        return this.playPositionalAudio(audio, character instanceof Character ? character.head.model : character.model, audio.startTime / 1_000, 'animations')
      }),
    )
    if (signal?.aborted) {
      for (const audio of [...audios, ...nonPositionalAudios]) {
        audio.stop()
      }
      for (const name of managedActorNames) {
        this.releaseActor(name)
      }
      return
    }
    const sentinel = audioActions.length > 0 || audios.length > 0 ? engine.lowerBackgroundMusic() : null

    const clip = new THREE.AnimationClip(animation.tree.name, -1, tracks)
    await this.playAnimationClip(this.scene, clip, {
      audios,
      nonPositionalAudios,
      lookAtKeys,
      faceAnimations,
      pointAtCameraObjects,
      roisToHideOnStop,
      managedActorNames,
      roisToRemoveOnStop,
      holdManagedActorNames,
      collisionRois,
      collisionCenter,
      collisionRadius,
      lockCamera,
      unskippable,
      loop,
      action,
      onFinished: () => {
        const bindings = new Map([...animationActors].map(([name, actor]) => [name, { ...actor, type: actor.type === WDB.ActorType.ManagedActor ? WDB.ActorType.Unknown : actor.type }]))
        const poses = getTransformsAtTime(animation.tree, bindings, rootTransform, Math.max(0, clip.duration * 1000))
        for (const name of managedActorNames) {
          const actor = animationActors.get(name)
          const pose = actor == null ? null : poses.get(actor.object.uuid)
          if (actor?.roi instanceof Character && pose != null) {
            actor.roi.syncAnimationPose(pose.position, pose.quaternion)
          }
        }
        this.onAnimationCharactersFinished(managedActorNames, managed)
      },
      onRelease: () => {
        if (sentinel != null) {
          engine.raiseBackgroundMusic(sentinel)
        }
      },
      metadata: { managed, capturesPlayer, location: animationLocation, hasCameraTrack: animation.cameraAnimation != null, released: false },
    })
    if (sentinel != null) {
      engine.raiseBackgroundMusic(sentinel)
    }
  }

  protected onAnimationCharactersFinished(_names: readonly string[], _managed: boolean): void {}

  public async playAnimationClip(
    root: THREE.Object3D,
    clip: THREE.AnimationClip,
    {
      action,
      onRelease,
      onFinished,
      metadata = { managed: false, capturesPlayer: false, location: -1, hasCameraTrack: false, released: false },
      audios = [],
      nonPositionalAudios = [],
      lookAtKeys,
      faceAnimations = [],
      pointAtCameraObjects = [],
      roisToHideOnStop = [],
      managedActorNames = [],
      roisToRemoveOnStop = [],
      holdManagedActorNames = [],
      collisionRois,
      collisionCenter,
      collisionRadius,
      lockCamera,
      unskippable,
      startAtTime = 0,
      stopAtTime,
      loop,
    }: {
      onRelease?: () => void
      onFinished?: () => void
      metadata?: ManagedAnimation
      action?: { id: number; siFile: string }
      audios?: THREE.PositionalAudio[]
      nonPositionalAudios?: Audio[]
      lookAtKeys?: WDB.Animation.VertexKey[]
      faceAnimations?: FaceAnimation[]
      pointAtCameraObjects?: THREE.Object3D[]
      roisToHideOnStop?: Roi3D[]
      managedActorNames?: string[]
      roisToRemoveOnStop?: Roi3D[]
      holdManagedActorNames?: readonly string[]
      collisionRois?: Roi3D[]
      collisionCenter?: THREE.Vector3
      collisionRadius?: number
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
    const suspendedActors = [...this._actors].filter(actor => !actor.animationBorrowed && managedActorNames.some(name => name.toLowerCase() === actor.roi.name))
    for (const actor of suspendedActors) {
      actor.suspend()
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
      let resolved = false
      const removeMe = () => {
        if (resolved) {
          return
        }
        resolved = true
        for (const faceAnimation of faceAnimations) {
          for (const { videoElement } of faceAnimation.animations) {
            videoElement.pause()
          }
          faceAnimation.character.resetHeadTexture()
        }
        for (const roi of roisToHideOnStop) {
          roi.visible = false
        }
        onFinished?.()
        for (const roi of roisToRemoveOnStop) {
          this.removeFromParents(roi.getAllModels())
        }
        for (const actor of suspendedActors) {
          if (!holdManagedActorNames.includes(actor.roi.name)) {
            actor.resume()
          }
        }
        for (const actorName of managedActorNames) {
          this.releaseActor(actorName)
        }
        for (const object of pointAtCameraObjects) {
          object.matrixWorldAutoUpdate = true
        }
        this._runningAnimations = this._runningAnimations.filter(a => a.mixer !== mixer)
        resolve()
      }

      this._runningAnimations.push({ managedActorNames, collisionRois, collisionCenter, collisionRadius, onRelease, metadata, action, mixer, clipAction, audios, nonPositionalAudios, resolve: removeMe, lookAtKeys, faceAnimations, pointAtCameraObjects, lockCamera, unskippable, stopAtTime })
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

  private _allowClick = false

  public beginPointer(): void {
    this._allowClick = false
  }

  public async pointerDown(_event: NormalizedMouseEvent): Promise<void> {
    this._allowClick = true
  }

  public async click(event: NormalizedMouseEvent): Promise<void> {
    this._raycaster.setFromCamera(new THREE.Vector2(event.ndcX, event.ndcY), this._render.camera)
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

    const saveGame = engine.currentSaveGame
    this._debugSaveGame.textContent = saveGame.name
    this._debugPlayer.textContent = saveGame.playerUnsafe ?? '—'
  }

  protected update(delta: number): void {
    for (const { mixer, resolve, lookAtKeys, faceAnimations, pointAtCameraObjects, stopAtTime, metadata } of this._runningAnimations) {
      const releasedPosition = metadata.released ? this.camera.position.clone() : null
      const releasedQuaternion = metadata.released ? this.camera.quaternion.clone() : null
      const finishedByStopAtTime = stopAtTime != null && mixer.time + delta > stopAtTime
      if (finishedByStopAtTime) {
        mixer.update(stopAtTime - mixer.time)
      } else {
        mixer.update(delta)
      }

      if (releasedPosition != null && releasedQuaternion != null) {
        this.camera.position.copy(releasedPosition)
        this.camera.quaternion.copy(releasedQuaternion)
      }

      if (lookAtKeys != null && !metadata.released) {
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
        const { videoElement, videoTexture } = currentAnimation
        const targetTime = mixer.time - currentAnimation.start / 1_000
        if (faceAnimation.currentVideoElement !== videoElement) {
          faceAnimation.currentVideoElement?.pause()
          faceAnimation.currentVideoElement = videoElement
          faceAnimation.character.headMaterial.map = videoTexture
          faceAnimation.character.headMaterial.needsUpdate = true
          videoElement.currentTime = targetTime
          void videoElement.play()
        } else if (videoElement.readyState >= videoElement.HAVE_CURRENT_DATA && Math.abs(videoElement.currentTime - targetTime) > 0.1) {
          videoElement.currentTime = targetTime
        }
      }

      for (const object of pointAtCameraObjects) {
        const chain: THREE.Object3D[] = []
        for (let node: THREE.Object3D | null = object; node != null; node = node.parent) {
          chain.unshift(node)
        }
        const animWorld = _ptatcamAnimWorld.identity()
        for (const node of chain) {
          _ptatcamLocal.compose(node.position, node.quaternion, node.scale)
          animWorld.multiply(_ptatcamLocal)
        }
        const up = _ptatcamUp.setFromMatrixColumn(animWorld, 1)
        const upScale = up.length()
        if (upScale < 1e-8) {
          continue
        }
        up.multiplyScalar(1 / upScale)
        const trans = _ptatcamTrans.setFromMatrixColumn(animWorld, 3)
        const toCam = _ptatcamToCam.copy(trans).sub(this.camera.position)
        const right = _ptatcamRight.crossVectors(up, toCam)
        if (right.lengthSq() < 1e-12) {
          continue
        }
        right.normalize()
        const forward = _ptatcamForward.crossVectors(right, up)
        const rightScale = _ptatcamCol.setFromMatrixColumn(animWorld, 0).length()
        const forwardScale = _ptatcamCol.setFromMatrixColumn(animWorld, 2).length()
        right.multiplyScalar(rightScale)
        up.multiplyScalar(upScale)
        forward.multiplyScalar(forwardScale)
        object.matrixWorld.copy(_ptatcamBasis.makeBasis(right, up, forward).setPosition(trans))
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

  public dispose(): void {
    this.skipAllRunningAnimations(true)
    for (const animation of [...this._runningAnimations]) {
      animation.resolve()
      animation.mixer.stopAllAction()
    }
    this._runningAnimations.length = 0
    this._actors.clear()
    this._clickListeners.clear()
    this._characters.clear()
    this.soundCache.dispose()
    this.scene.clear()
  }

  public readonly soundCache = engine.createSoundCache()

  public async cachePositionalAudio(action: PositionalAudioAction): Promise<void> {
    await this.soundCache.register(action)
  }

  public async playPositionalAudio(action: PositionalAudioAction | string, parent: THREE.Object3D, delay = 0, type: AudioType = 'effects'): Promise<THREE.PositionalAudio> {
    if (typeof action === 'string') {
      return this.soundCache.play(action, parent, false, delay)
    }
    const audio = await engine.getPositionalAudio(action, type)
    parent.add(audio)
    const onEnded = audio.onEnded.bind(audio)
    audio.onEnded = () => {
      onEnded()
      audio.removeFromParent()
    }
    audio.play(delay)
    return audio
  }

  public get render3d(): boolean {
    return this.scene.visible
  }

  public set render3d(value: boolean) {
    this.scene.visible = value
  }

  public resize(_width: number, _height: number): void {}

  public escape(): boolean {
    return false
  }

  public gesture(kind: import('../input.ts').Gesture, event: NormalizedMouseEvent): void {
    if (kind === 'click' && this._allowClick) {
      this._allowClick = false
      void this.click(event)
    }
  }

  public keyPressed(key: string, _character?: string): void {
    if (key === 'KeyD' && import.meta.env.DEV) {
      engine.debugMode = !engine.debugMode
    }

    if (key === 'KeyC' && import.meta.env.DEV) {
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

    if (key === 'Space') {
      this.handleSkipKey()
    }

    if (key === 'KeyP' && import.meta.env.DEV) {
      this.skipAllRunningAnimations(true)
    }
  }

  protected handleSkipKey(): void {}

  public get hasReleasedPlayerAnimation(): boolean {
    return this._runningAnimations.some(running => running.metadata.released)
  }

  public toggleManagedAnimations(release: boolean): void {
    for (const running of [...this._runningAnimations]) {
      const decision = skipDecision(running.metadata, release)
      if (decision === 'release') {
        running.onRelease?.()
        running.metadata.released = true
        running.metadata.capturesPlayer = false
        running.lockCamera = false
      } else if (decision === 'stop') {
        this.stopRunningAnimation(running)
      }
    }
  }

  private stopRunningAnimation = (running: (typeof this._runningAnimations)[number]): void => {
    if (running.clipAction.loop === THREE.LoopOnce) {
      running.mixer.setTime(running.stopAtTime ?? running.clipAction.getClip().duration)
    }
    for (const audio of [...running.audios, ...running.nonPositionalAudios]) {
      audio.stop()
    }
    running.resolve()
  }

  public stopAnimationsInRange(siFile: string, firstId: number, lastId = firstId): void {
    for (const running of [...this._runningAnimations]) {
      if (running.action?.siFile === siFile && running.action.id >= firstId && running.action.id <= lastId) {
        this.stopRunningAnimation(running)
      }
    }
  }

  public stopLoopingAnimations(): void {
    for (const runningAnimation of this._runningAnimations) {
      if (runningAnimation.clipAction.loop !== THREE.LoopOnce) {
        runningAnimation.resolve()
      }
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
