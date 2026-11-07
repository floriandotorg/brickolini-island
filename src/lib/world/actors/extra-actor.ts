import * as THREE from 'three'
import { BNsAss01, BNsDis01 } from '../../../actions/isle'
import type { Boundary, Edge } from '../../assets/boundary'
import type { Roi3D } from '../../assets/model'
import { tumbleAxis, walkingBehavior } from '../../walking-policy'
import { PathActor } from './path-actor'

let hitCounter = 0

export class ExtraActor extends PathActor {
  public borrowed = false
  public walkingMode = 1
  private _hitBlockCounter = 0
  private _firstSegment = true
  private _reaction: { time: number; position: THREE.Vector3; quaternion: THREE.Quaternion; disassemble: boolean; axis: THREE.Vector3 } | null = null

  public override get animationBorrowed(): boolean {
    return this.borrowed
  }

  public get boundary(): Boundary | null {
    return this._destination?.boundary ?? null
  }

  public get reacting(): boolean {
    return this._reaction != null
  }

  protected override get useArcLength(): boolean {
    return false
  }
  protected override _calculateSpline(options: Parameters<PathActor['_calculateSpline']>[0] = {}): THREE.CubicBezierCurve3 {
    const curve = super._calculateSpline(this._firstSegment ? { ...options, forceDistance: 1 } : options)
    this._firstSegment = false
    return curve
  }
  protected override _switchBoundary(): void {
    const original = this.destination.boundary
    let boundary = original
    const entered = this.destination.edge
    let edge = entered
    let scale = this.destination.scale
    if (entered.isTraversableFromFace(original)) {
      boundary = (entered.faceA === original ? entered.faceB : entered.faceA) ?? original
      const anyEdge = !entered.isTraversableIntoFaceWithMask(boundary, 1)
      const qualifies = (candidate: Edge): boolean => {
        const other = candidate.faceA === boundary ? candidate.faceB : candidate.faceA
        return candidate.isTraversable() && (anyEdge || (other != null && (other.flags & 1) !== 0))
      }
      const count = boundary.edges.filter(qualifies).length
      const behavior = count <= 1 ? { clockwise: false, index: 0 } : count === 2 ? { clockwise: false, index: 1 } : walkingBehavior(count - 1, this.walkingMode)
      let index = behavior.index
      for (let n = 0; n < boundary.edges.length && index > 0; ++n) {
        edge = behavior.clockwise ? edge.getCWEdge(boundary) : edge.getCCWEdge(boundary)
        if (qualifies(edge)) {
          --index
        }
      }
      if (edge === entered) {
        edge = entered.getCCWEdge(boundary).getCCWEdge(boundary)
      }
      if (boundary === original) {
        scale = 1 - scale
      }
    } else {
      edge = entered.getCCWEdge(boundary)
      while (edge !== entered && !edge.isTraversable()) {
        edge = edge.getCCWEdge(boundary)
      }
      if (edge === entered) {
        edge = entered.getCCWEdge(boundary).getCCWEdge(boundary)
      }
      scale = 1 - scale
    }
    this._destination = { boundary, edge, scale }
    this._spline = this._calculateSpline()
    this._distanceTraveled = 0
  }
  public blocksPlayer(from: THREE.Vector3, to: THREE.Vector3): boolean {
    if (this._hitBlockCounter > 0 && from.distanceToSquared(this._isle.camera.position) < 10) {
      return false
    }
    const center = this._isle.camera.position.clone().add(new THREE.Vector3(0, -1.25, 0))
    const closest = new THREE.Line3(from, to).closestPointToPoint(center, true, new THREE.Vector3())
    return closest.distanceToSquared(center) <= 1
  }

  public turnAround(): void {
    if (this._spline == null || this._destination == null) {
      return
    }
    this._spline = null
    const boundary = this._destination.boundary
    const direction = this.roi.getWorldDirection(new THREE.Vector3()).negate()
    const edge = boundary.edges.reduce((best, edge) => (edge.getFaceNormal(boundary).dot(direction) > best.getFaceNormal(boundary).dot(direction) ? edge : best))
    this._destination = { boundary, edge, scale: 0.5 }
    this.roi.moveRoiTo(this.roi.position, this.roi.getWorldQuaternion().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)))
  }

  public override onCollision(roi: Roi3D | null, mover = false): void {
    if (this.borrowed || this._reaction != null) {
      return
    }
    if (mover) {
      if (this._hitBlockCounter === 0) {
        this._hitBlockCounter = 100
        this.turnAround()
      }
      return
    }
    if (++hitCounter % 2 !== 0) {
      return
    }
    const direction = roi == null ? this._isle.camera.getWorldDirection(new THREE.Vector3()) : roi.getWorldDirection(new THREE.Vector3()).negate()
    const pushed = this.roi.position.clone().addScaledVector(direction, 2)
    const disassemble = this.boundary?.isInside(pushed) ?? false
    this._reaction = { time: 0, position: this.roi.position.clone(), quaternion: this.roi.getWorldQuaternion(), disassemble, axis: new THREE.Vector3(...tumbleAxis(direction.x, direction.z)) }
    if (disassemble) {
      if (!this._animationActions.has(-21)) {
        void this.addAnimationAction(-21, BNsDis01)
      }
      if (!this._animationActions.has(-20)) {
        void this.addAnimationAction(-20, BNsAss01)
      }
      this.roi.moveRoiTo(pushed)
    }
    if (this._isle.soundCache.has('crash5')) {
      this._isle.soundCache.play('crash5', this.roi.model)
    }
  }

  public override get collisionEnabled(): boolean {
    return super.collisionEnabled && !this.borrowed && this._reaction == null
  }

  public override checkCollision(from: THREE.Vector3, to: THREE.Vector3): boolean {
    return !this.borrowed && this._reaction == null && super.checkCollision(from, to)
  }

  public override update(delta: number): { from: THREE.Vector3; to: THREE.Vector3 } {
    this._hitBlockCounter = Math.max(0, this._hitBlockCounter - delta * 300)
    const stationary = { from: this.roi.position.clone(), to: this.roi.position.clone() }
    if (this.borrowed || (this.boundary != null && this._isle.ambient.isBoundaryBusy(this.boundary))) {
      return stationary
    }
    const reaction = this._reaction
    if (reaction != null) {
      reaction.time += delta
      const duration = reaction.disassemble ? 3 : 2
      if (reaction.time >= duration) {
        this.roi.moveRoiTo(reaction.position, reaction.quaternion)
        this._reaction = null
        this._spline = null
      } else if (reaction.disassemble) {
        this.applyAnimationAt(reaction.time < 2 ? -21 : -20, (reaction.time < 2 ? reaction.time : reaction.time - 2) * 1000)
      } else {
        this.roi.moveRoiTo(reaction.position.clone().add(new THREE.Vector3(0, 2.5, 0)), reaction.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(reaction.axis, reaction.time * 21)))
      }
      return stationary
    }
    const result = super.update(delta)
    this.roi.visible = !this.boundary?.hidden
    return result
  }
}
