import type { Boundary, Edge } from '../../assets/boundary'
import { RaceActor } from './race-actor.ts'

export class JetskiRacer extends RaceActor {
  protected override curveFactor = 0.95
  protected override acceleration = 0.04
  protected override rubberBandFactor = 0.5
  protected override idleCreep = true

  protected override _switchBoundary(): void {
    const boundary = this.destination.boundary
    const edge = this.destination.edge
    const jump = boundary.name.toLowerCase() === 'edg10_61' && edge === boundary.edges[2] ? 'edg10_62' : boundary.name.toLowerCase() === 'edg10_55' && edge === boundary.edges[2] ? 'edg10_58' : null
    if (jump != null) {
      const landing = this._isle.boundaryManager.getBoundary(jump)
      if (landing == null) {
        throw new Error(`Missing ramp landing ${jump}`)
      }
      this.startJump(landing, landing.edges[0])
      return
    }
    super._switchBoundary()
  }

  private startJump = (landing: Boundary, edge: Edge): void => {
    this._destination = { boundary: edge.getOtherBoundary(landing), edge, scale: this.destination.scale }
    this._speed = Math.max(this._speed, 8)
    this._spline = this._calculateSpline({ forceDistance: 1 })
    this._distanceTraveled = 0
  }
}

export class JetskiRaceActor extends JetskiRacer {
  protected override adjustsSpeed = false
}
