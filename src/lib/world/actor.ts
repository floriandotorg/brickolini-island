import * as THREE from 'three'
import type { Roi3D } from '../assets/model'

export enum ColliderType {
  Box = 0,
  Sphere = 1,
}

export abstract class Actor {
  protected _roi: Roi3D
  protected _colliderType: ColliderType

  constructor(roi: Roi3D) {
    this._roi = roi
    this._colliderType = ColliderType.Sphere
    roi.actor = this
  }

  public get roi(): Roi3D {
    return this._roi
  }

  public get colliderType(): ColliderType {
    return this._colliderType
  }

  public set colliderType(colliderType: ColliderType) {
    this._colliderType = colliderType
  }

  public checkCollision(from: THREE.Vector3, to: THREE.Vector3): boolean {
    if (this._colliderType === ColliderType.Sphere) {
      return this.checkSphereCollision(from, to)
    }
    return this.checkBoxCollision(from, to)
  }

  private checkSphereCollision(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const sphere = this._roi.model.getWorldBoundingSphere()
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
    const box = this._roi.model.getWorldBoundingBox()
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

  public abstract update(delta: number): void
  public abstract onCollision(from: THREE.Vector3, to: THREE.Vector3): void

  public dispose(): void {
    this._roi.actor = null
  }
}
