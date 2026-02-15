import * as THREE from 'three'
import type { Boundary, Edge } from '../../assets/boundary'
import { Actor } from '../actor'

type Destination = {
  boundary: Boundary
  edge: Edge
  scale: number
}

export class PathActor extends Actor {
  protected _destination: Destination | null = null

  protected _spline: THREE.CubicBezierCurve3 | null = null
  protected _distanceTraveled = 0

  protected get destination() {
    if (this._destination == null) {
      throw new Error('Destination not set')
    }
    return this._destination
  }

  public setCurrentDestination(destination: Destination): void {
    this._destination = destination
  }

  protected _switchBoundary(): void {
    if (!this.destination.edge.isTraversableFromFace(this.destination.boundary)) {
      let edge = this.destination.edge
      do {
        edge = edge.getCCWEdge(this.destination.boundary)
        if (edge.isTraversable()) {
          this._destination = {
            boundary: edge.getOtherBoundary(this.destination.boundary),
            edge,
            scale: this.destination.scale,
          }
          this._spline = this._calculateSpline()
          this._distanceTraveled = 0
          return
        }
      } while (edge !== this.destination.edge)

      throw new Error(`${this.roi.name}: No traversable edge found`)
    }

    const nextBoundary = this.destination.edge.getOtherBoundary(this.destination.boundary)
    let edge = this.destination.edge
    let traversableEdges = 0
    do {
      edge = edge.getCCWEdge(nextBoundary)
      if (edge.isTraversable()) {
        ++traversableEdges
      }
    } while (edge !== this.destination.edge)

    // TODO properly select next edge index from traversableEdges
    --traversableEdges

    while (traversableEdges > 0) {
      edge = edge.getCCWEdge(nextBoundary)
      if (edge.isTraversable()) {
        --traversableEdges
      }
    }

    this._destination = {
      boundary: nextBoundary,
      edge,
      scale: this.destination.scale,
    }

    this._spline = this._calculateSpline()
    this._distanceTraveled = 0
  }

  protected _calculateSpline({ forceDistance }: { forceDistance?: number } = {}): THREE.CubicBezierCurve3 {
    const start = this.roi.position.clone()
    const boundaryUp = new THREE.Vector3(-this.destination.boundary.up.x, this.destination.boundary.up.y, this.destination.boundary.up.z)
    const startDirection = this.roi.model.getWorldDirection(new THREE.Vector3())
    const startRight = new THREE.Vector3().crossVectors(boundaryUp, startDirection).normalize()
    startDirection.crossVectors(startRight, boundaryUp).normalize()
    const destination = this.destination.edge.getCWVertex(this.destination.boundary).clone().lerp(this.destination.edge.getCCWVertex(this.destination.boundary), this.destination.scale)
    const destinationDirection = boundaryUp.clone().cross(this.destination.edge.getFaceNormal(this.destination.boundary))
    const distance = start.distanceTo(destination)
    const c1 = start.clone().sub(startDirection.divideScalar(3).multiplyScalar(forceDistance ?? distance))
    const c2 = destination.clone().add(destinationDirection.divideScalar(3).multiplyScalar(forceDistance ?? distance))
    const curve = new THREE.CubicBezierCurve3(start, c1, c2, destination)

    if (start.distanceTo(destination) < 0.5) {
      console.log('Start and destination are too close', this.destination)
    }

    return curve
  }

  public override update(delta: number): { from: THREE.Vector3; to: THREE.Vector3 } {
    super.update(delta)

    this.roi.visible = true

    if (this._spline == null) {
      this._spline = this._calculateSpline()
      this._distanceTraveled = 0
    }

    this._distanceTraveled += (delta * this._speed) / this._spline.getLength()

    const distancedTraveledClamped = Math.min(this._distanceTraveled, 1)
    const matrix = new THREE.Matrix4()
    const worldUp = new THREE.Vector3(0, 1, 0)
    const dir = this._spline.getTangentAt(distancedTraveledClamped).multiplyScalar(-1).normalize()
    const right = new THREE.Vector3().crossVectors(worldUp, dir).normalize()
    const up = new THREE.Vector3().crossVectors(dir, right).normalize()
    matrix.makeBasis(right, up, dir)
    const quaternion = new THREE.Quaternion()
    quaternion.setFromRotationMatrix(matrix)
    const from = this.roi.position.clone()
    const to = this._spline.getPointAt(distancedTraveledClamped)
    this.roi.moveRoiTo(to, quaternion)

    this._isle.boundaryManager.update(from, to, this.roi)

    if (this._distanceTraveled >= 1) {
      this._switchBoundary()
    }

    return { from, to }
  }
}
