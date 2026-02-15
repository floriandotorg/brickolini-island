import * as THREE from 'three'
import type { IsleBase } from '../../worlds/isle-base'
import type { AnimationAction } from '../action-types'
import type { Roi3D } from '../assets/model'
import { Entity } from './entity'

export enum ColliderType {
  None = 0,
  Sphere = 1,
  Box = 2,
}

export abstract class Actor extends Entity {
  private _colliderType = ColliderType.None
  protected _animationActions: Map<number, AnimationAction> = new Map()
  protected _speed = 0

  constructor(
    _roi: Roi3D,
    protected readonly _isle: IsleBase,
  ) {
    super(_roi)
    _roi.actor = this
  }

  public get colliderType(): ColliderType {
    return this._colliderType
  }

  public set colliderType(colliderType: ColliderType) {
    this._colliderType = colliderType
  }

  public addAnimationAction(speed: number, animation: AnimationAction) {
    this._animationActions.set(speed, animation)
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
      return sphere.center.distanceTo(from) <= sphere.radius
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
    if (box == null) {
      return false
    }
    const ray = new THREE.Ray(from, to.clone().sub(from).normalize())
    const intersection = ray.intersectBox(box, new THREE.Vector3())
    if (intersection == null) {
      return false
    }
    return from.distanceTo(intersection) <= from.distanceTo(to)
  }

  public update(_delta: number): { from: THREE.Vector3; to: THREE.Vector3 } {
    return { from: this.roi.position.clone(), to: this.roi.position.clone() }
  }
  public onCollision(_from: THREE.Vector3, _to: THREE.Vector3): void {}
}
