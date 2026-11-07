import * as THREE from 'three'
import type { Roi3D } from '../../assets/model'
import { engine } from '../../engine'
import { approachRaceSpeed, raceTargetSpeed } from '../../race-speed.ts'
import { PathActor } from './path-actor'

export class RaceActor extends PathActor {
  public lastWaypoint = 0
  public maximumSpeed: number | null = null
  protected curveFactor = 0.65
  protected acceleration = 0.03
  protected rubberBandFactor = 0.6
  protected idleCreep = false
  protected adjustsSpeed = true
  private _hitUntil = 0
  private _hitHeight = 0
  private _hitQuaternion: THREE.Quaternion | null = null

  public get stunned(): boolean {
    return this._hitUntil > engine.elapsedTimeMilliseconds
  }

  public override onCollision(_roi: Roi3D | null): void {
    if (this._hitUntil > engine.elapsedTimeMilliseconds) {
      return
    }
    this._hitUntil = engine.elapsedTimeMilliseconds + 2000
    this._hitHeight = this.roi.position.y
    this._hitQuaternion = this.roi.getWorldQuaternion(new THREE.Quaternion())
    this.roi.position.y += 2
  }

  public override update(delta: number) {
    if ('raceStarted' in this._isle && !this._isle.raceStarted) {
      return this.idleCreep ? super.update(0.001) : { from: this.roi.position.clone(), to: this.roi.position.clone() }
    }
    if (this._hitQuaternion != null) {
      if (engine.elapsedTimeMilliseconds < this._hitUntil) {
        this.roi.model.rotateX(0.6 * delta * 60)
        return { from: this.roi.position.clone(), to: this.roi.position.clone() }
      }
      this.roi.position.y = this._hitHeight
      this.roi.moveRoiTo(this.roi.position, this._hitQuaternion)
      this._hitQuaternion = null
    }
    this.maximumSpeed ??= this._speed
    if (this.adjustsSpeed && this.hasDestination()) {
      const playerWaypoint = 'playerWaypoint' in this._isle && typeof this._isle.playerWaypoint === 'number' ? this._isle.playerWaypoint : 0
      const normal = this.destination.edge.getFaceNormal(this.destination.boundary)
      const curve = Math.abs(normal.dot(this.roi.getWorldDirection(new THREE.Vector3()))) > 0.5
      const target = raceTargetSpeed(this.maximumSpeed, curve, this.lastWaypoint, playerWaypoint, this.curveFactor, this.rubberBandFactor)
      this._speed = approachRaceSpeed(this._speed, target, delta * 1000, this.acceleration)
    }
    return super.update(delta)
  }

  protected override _calculateSpline(options: Parameters<PathActor['_calculateSpline']>[0] = {}): THREE.CubicBezierCurve3 {
    return super._calculateSpline({ forceDistance: 5, ...options })
  }
}
