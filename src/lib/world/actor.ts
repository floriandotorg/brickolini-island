import * as THREE from 'three'
import type { IsleBase } from '../../worlds/isle-base'
import type { AnimationAction } from '../action-types'
import { type Animation3D, type AnimationActor, getChildTransformsAtTime, parse3DAnimation } from '../assets/animation'
import { getAction } from '../assets/load'
import type { Roi3D } from '../assets/model'
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
    const { animationActors } = await this._isle.resolveAnimationActors(animation)
    runtime.animation = animation
    runtime.animationActors = animationActors
    runtime.preparing = null
  }

  private _selectAnimationKey(): number | null {
    if (this._animationRuntimes.size === 0) {
      return null
    }
    const sorted = [...this._animationRuntimes.keys()].sort((a, b) => a - b)
    const speed = Math.max(this._speed, 0)
    let selected = sorted[0]
    for (const key of sorted) {
      if (key <= speed) {
        selected = key
      }
    }
    return selected
  }

  protected updateAnimation(delta: number): void {
    const key = this._selectAnimationKey()
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

    runtime.time += delta * 1000

    const durationMs = this._getAnimationDurationMs(runtime.animation.tree)
    if (durationMs > 0) {
      runtime.time = runtime.time % durationMs
    }

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

  public checkCollision(from: THREE.Vector3, to: THREE.Vector3): boolean {
    if (this._colliderType === ColliderType.Sphere) {
      return this.checkSphereCollision(from, to)
    }
    return this.checkBoxCollision(from, to)
  }

  private checkSphereCollision(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const sphere = this.roi.model.getWorldBoundingSphere()
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

  private checkBoxCollision(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const box = this.roi.model.getWorldBoundingBox()
    const direction = to.clone().sub(from)
    const length = direction.length()
    if (length < 0.0001) {
      return false
    }
    if (box.containsPoint(from)) {
      return false
    }
    const ray = new THREE.Ray(from, direction.normalize())
    const intersection = ray.intersectBox(box, new THREE.Vector3())
    if (intersection == null) {
      return false
    }
    return from.distanceTo(intersection) <= length
  }

  public update(_delta: number): { from: THREE.Vector3; to: THREE.Vector3 } | null {
    return null
  }

  public onCollision(_roi: Roi3D | null): void {}
}
