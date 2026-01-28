import * as THREE from 'three'
import type { Boundary, Edge } from '../../assets/boundary'
import { Actor } from '../actor'

type Destination = {
  boundary: Boundary
  edge: Edge
  scale: number
}

export class PathActor extends Actor {
  private _destination: Destination | null = null

  private _spline: THREE.CubicBezierCurve3 | null = null
  private _distanceTraveled = 0
  private _speed = 3

  private get destination() {
    if (this._destination == null) {
      throw new Error('Destination not set')
    }
    return this._destination
  }

  public setCurrentDestination(destination: Destination): void {
    this._destination = destination
    console.log(destination)
  }

  private _switchBoundary(): void {
    if (!this.destination.edge.isTraversable()) {
      throw new Error('Current edge is not traversable')
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

  private bla = 0

  private _calculateSpline(): THREE.CubicBezierCurve3 {
    const start = this.roi.position
    const startDirection = this.roi.model.getWorldDirection(new THREE.Vector3())
    const destination = this.destination.edge.pointA.clone().lerp(this.destination.edge.pointB, this.destination.scale)
    const destinationDirection = new THREE.Vector3(this.destination.boundary.up.x, this.destination.boundary.up.y, this.destination.boundary.up.z).clone().cross(this.destination.edge.direction)
    if (this.destination.boundary === this.destination.edge.faceA) {
      destinationDirection.negate()
    }
    const distance = start.distanceTo(destination)
    const c1 = start.clone().add(startDirection.divideScalar(3).multiplyScalar(distance))
    const c2 = destination.clone().sub(destinationDirection.divideScalar(3).multiplyScalar(distance))
    const curve = new THREE.CubicBezierCurve3(start, c1, c2, destination)

    const cols = ['red', 'green', 'blue', 'yellow', 'purple', 'orange', 'pink', 'brown', 'gray', 'black', 'white']

    if (start.distanceTo(destination) < 0.5) {
      console.log('Start and destination are too close', this.destination)
    }

    if (++this.bla > cols.length) {
      this.bla = 0
    }

    this._isle.debugDrawSphere(c1, cols[this.bla], 0.1)
    this._isle.debugDrawSphere(c2, cols[this.bla], 0.05)

    for (let n = 0; n < 1; n += 0.1) {
      const point = curve.getPoint(n)
      const tangent = curve.getTangent(n)
      this._isle.debugDrawArrow(point, point.clone().add(tangent.normalize()), cols[this.bla])
    }

    return curve
  }

  public override update(delta: number): void {
    super.update(delta)

    this.roi.visible = true

    if (this._spline == null) {
      this._spline = this._calculateSpline()
      this._distanceTraveled = 0
    }

    this._distanceTraveled += (delta * this._speed) / this._spline.getLength()
    if (this._distanceTraveled > 1) {
      this._switchBoundary()
    }

    if (this._spline != null) {
      const matrix = new THREE.Matrix4()
      const up = new THREE.Vector3(0, 1, 0)
      const dir = this._spline.getTangent(this._distanceTraveled).multiplyScalar(-1).normalize()
      const right = new THREE.Vector3().crossVectors(up, dir).normalize()
      matrix.makeBasis(right, up, dir)
      const quaternion = new THREE.Quaternion()
      quaternion.setFromRotationMatrix(matrix)
      quaternion.normalize()
      this.roi.moveRoiTo(this._spline.getPoint(this._distanceTraveled), quaternion)
    }
  }
}
