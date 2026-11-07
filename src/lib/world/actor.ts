import * as THREE from 'three'
import type { IsleBase } from '../../worlds/isle-base'
import type { AnimationAction } from '../action-types'
import { type Animation3D, type AnimationActor, getChildTransformsAtTime, parse3DAnimation } from '../assets/animation'
import { getAction } from '../assets/load'
import type { Roi3D } from '../assets/model'
import { WDB } from '../assets/wdb'
import { advanceCycleTime, selectSpeedTier } from '../locomotion.ts'
import { Entity } from './entity'

export enum ColliderType {
  Sphere = 1,
  Box = 2,
}

type AnimationRuntime = {
  action: AnimationAction
  animation: Animation3D | null
  animationActors: Map<string, AnimationActor> | null
  preparing: Promise<void> | null
  time: number
}

export abstract class Actor extends Entity {
  private _colliderType = ColliderType.Sphere
  protected _animationActions: Map<number, AnimationAction> = new Map()
  private _animationRuntimes = new Map<number, AnimationRuntime>()
  private _activeAnimationKey: number | null = null
  protected _speed = 0

  private _suspendCount = 0

  public get animationBorrowed(): boolean {
    return false
  }

  public get suspended(): boolean {
    return this._suspendCount > 0
  }

  public suspend(): void {
    if (this._suspendCount === 0) {
      this.roi.captureTransform()
    }
    ++this._suspendCount
  }

  public resume(): void {
    if (this._suspendCount === 0) {
      return
    }
    --this._suspendCount
    if (this._suspendCount === 0) {
      this.roi.restoreTransform()
    }
  }

  constructor(
    _roi: Roi3D,
    protected readonly _isle: IsleBase,
  ) {
    super(_roi)
    _roi.actor = this
  }

  public async init(): Promise<void> {}

  public get colliderType(): ColliderType {
    return this._colliderType
  }

  public set colliderType(colliderType: ColliderType) {
    this._colliderType = colliderType
  }

  public async addAnimationAction(speed: number, action: AnimationAction): Promise<void> {
    this._animationActions.set(speed, action)
    const runtime: AnimationRuntime = {
      action,
      animation: null,
      animationActors: null,
      preparing: null,
      time: 0,
    }
    this._animationRuntimes.set(speed, runtime)
    runtime.preparing = this._prepareRuntime(runtime)
    await runtime.preparing
  }

  private async _prepareRuntime(runtime: AnimationRuntime): Promise<void> {
    const animation = parse3DAnimation(await getAction(runtime.action))
    const animationActors = new Map<string, AnimationActor>()
    for (const entry of animation.actors) {
      const name = entry.name.toLowerCase()
      const roi = entry.type === WDB.ActorType.ManagedActor || name.startsWith('actor_') || name === this.roi.name ? this.roi : this._isle.findRoi(name)
      if (roi != null) {
        animationActors.set(name, { type: entry.type ?? WDB.ActorType.ManagedActor, object: roi.model, children: new Map(roi.children.map(child => [child.name, child.model])), roi })
      }
    }
    if (!animationActors.has(animation.tree.name)) {
      animationActors.set(animation.tree.name, { type: WDB.ActorType.ManagedActor, object: this.roi.model, children: new Map(this.roi.children.map(child => [child.name, child.model])), roi: this.roi })
    }
    runtime.animation = animation
    runtime.animationActors = animationActors
    runtime.preparing = null
  }

  private _selectAnimationKey(): number | null {
    return selectSpeedTier([...this._animationRuntimes.keys()], this._speed)
  }

  public clearAnimationActions(): void {
    this._animationActions.clear()
    this._animationRuntimes.clear()
    this._activeAnimationKey = null
  }

  protected applyAnimationAt(key: number, time: number): void {
    this.updateAnimation(0, key, time)
  }

  protected updateAnimation(delta: number, forcedKey?: number, forcedTime?: number): void {
    const key = forcedKey ?? this._selectAnimationKey()
    if (key == null) {
      return
    }

    if (key !== this._activeAnimationKey) {
      this._activeAnimationKey = key
      const runtime = this._animationRuntimes.get(key)
      if (runtime != null) {
        runtime.time = 0
      }
    }

    const runtime = this._animationRuntimes.get(key)
    if (runtime == null || runtime.animation == null || runtime.animationActors == null) {
      return
    }

    const durationMs = this._getAnimationDurationMs(runtime.animation.tree)
    runtime.time = forcedTime ?? advanceCycleTime(runtime.time, delta, this._speed, durationMs)

    const baseTransform = new THREE.Matrix4()
    baseTransform.makeRotationFromQuaternion(this.roi.getWorldQuaternion(new THREE.Quaternion()))
    baseTransform.setPosition(this.roi.position)

    const transforms = getChildTransformsAtTime(runtime.animation.tree, runtime.animationActors, baseTransform, runtime.time)
    for (const [uuid, { position, quaternion, scale }] of transforms) {
      const object = this._isle.scene.getObjectByProperty('uuid', uuid)
      if (object != null) {
        object.position.copy(position)
        object.quaternion.copy(quaternion)
        object.scale.copy(scale)
      }
    }
  }

  private _getAnimationDurationMs(node: Animation3D['tree']): number {
    return Math.max(node.translationKeys.at(-1)?.timeAndFlags.time ?? 0, node.rotationKeys.at(-1)?.timeAndFlags.time ?? 0, node.scaleKeys.at(-1)?.timeAndFlags.time ?? 0, ...node.children.map(c => this._getAnimationDurationMs(c)))
  }

  public set speed(speed: number) {
    this._speed = speed
  }

  public get collisionEnabled(): boolean {
    return this.roi.model.visible
  }

  public checkCollision(from: THREE.Vector3, to: THREE.Vector3, moverCollideBox = false): boolean {
    if (moverCollideBox && this._colliderType === ColliderType.Box) {
      return this.checkBoxCollision(from, to)
    }
    return this.checkSphereCollision(from, to)
  }

  public static intersectRoi(from: THREE.Vector3, to: THREE.Vector3, roi: Roi3D): boolean {
    const sphere = roi.model.getWorldBoundingSphere()
    const direction = to.clone().sub(from)
    const length = direction.length()
    if (length < 0.0001) {
      return false
    }
    if (from.distanceTo(sphere.center) <= sphere.radius) {
      return false
    }
    direction.normalize()

    const toSphere = sphere.center.clone().sub(from)
    const projection = toSphere.dot(direction)
    const clampedProjection = Math.max(0, Math.min(length, projection))
    const closestPoint = from.clone().add(direction.clone().multiplyScalar(clampedProjection))
    return closestPoint.distanceTo(sphere.center) <= sphere.radius
  }

  private checkSphereCollision(from: THREE.Vector3, to: THREE.Vector3): boolean {
    return Actor.intersectRoi(from, to, this.roi)
  }

  private checkBoxCollision(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const model = this.roi.model
    model.updateWorldMatrix(true, false)
    const inverseMatrix = model.matrixWorld.clone().invert()
    const localFrom = from.clone().applyMatrix4(inverseMatrix)
    const localTo = to.clone().applyMatrix4(inverseMatrix)
    const direction = localTo.clone().sub(localFrom)
    const length = direction.length()
    if (length < 0.0001) {
      return false
    }
    direction.normalize()
    const ray = new THREE.Ray(localFrom, direction)
    const intersection = ray.intersectBox(model.boundingBox, new THREE.Vector3())
    if (intersection == null) {
      return false
    }
    return localFrom.distanceTo(intersection) <= length
  }

  public update(_delta: number): { from: THREE.Vector3; to: THREE.Vector3 } | null {
    return null
  }

  public onCollision(_roi: Roi3D | null): void {}
}
