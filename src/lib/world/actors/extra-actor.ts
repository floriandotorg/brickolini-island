import * as THREE from 'three'
import { BNsAss01, BNsDis01 } from '../../../actions/isle'
import type { Boundary, Edge } from '../../assets/boundary'
import type { Roi3D } from '../../assets/model'
import { PathActor } from './path-actor'

let hitCounter = 0

export class ExtraActor extends PathActor {
  public borrowed = false
  public walkingMode = 1
  private _reaction: { time: number; position: THREE.Vector3; quaternion: THREE.Quaternion; disassemble: boolean } | null = null

  public override get animationBorrowed(): boolean {
    return this.borrowed
  }

  public get boundary(): Boundary | null {
    return this._destination?.boundary ?? null
  }

  public get reacting(): boolean {
    return this._reaction != null
  }

  protected override chooseEdge(edges: Edge[]): Edge | undefined {
    if (this.walkingMode === 2) {
      edges.reverse()
    }
    const name = this.roi.name
    const index = name === 'pepper' || name === 'laura' ? 1 : name === 'nick' || name === 'brickstr' ? Math.floor(Math.random() * edges.length) : 0
    return edges[Math.min(index, edges.length - 1)]
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

  public override onCollision(roi: Roi3D | null): void {
    if (this.borrowed || this._reaction != null) {
      return
    }
    if (roi != null) {
      this.turnAround()
      return
    }
    if (++hitCounter % 2 !== 0) {
      return
    }
    const direction = this.roi.position.clone().sub(this._isle.camera.position).setY(0).normalize()
    const pushed = this.roi.position.clone().addScaledVector(direction, 2)
    const disassemble = this.boundary?.isInside(pushed) ?? false
    this._reaction = { time: 0, position: this.roi.position.clone(), quaternion: this.roi.getWorldQuaternion(), disassemble }
    if (disassemble) {
      void this.addAnimationAction(-21, BNsDis01)
      void this.addAnimationAction(-20, BNsAss01)
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
    const stationary = { from: this.roi.position.clone(), to: this.roi.position.clone() }
    if (this.borrowed) {
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
        this.roi.moveRoiTo(reaction.position.clone().add(new THREE.Vector3(0, 2.5, 0)), reaction.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), reaction.time * 21)))
      }
      return stationary
    }
    const result = super.update(delta)
    this.roi.visible = !this.boundary?.hidden
    return result
  }
}
