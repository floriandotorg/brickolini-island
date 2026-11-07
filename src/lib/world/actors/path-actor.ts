import * as THREE from 'three'
import type { Boundary, Edge } from '../../assets/boundary'
import { pathFraction } from '../../walking-policy'
import { Actor } from '../actor'
import type { BoundaryGraphNode } from '../boundary-manager'

type Destination = {
  boundary: Boundary
  edge: Edge
  scale: number
}

export class PathActor extends Actor {
  protected _destination: Destination | null = null

  protected _spline: THREE.CubicBezierCurve3 | null = null
  protected _distanceTraveled = 0
  private _finishingPath = false

  public get isFollowingPath(): boolean {
    return this._path != null || this._finishingPath
  }

  private _path: {
    destinations: Destination[]
    finalPosition: THREE.Vector3
    finalDirection: THREE.Vector3
  } | null = null

  protected get destination() {
    if (this._destination == null) {
      throw new Error('Destination not set')
    }
    return this._destination
  }

  protected hasDestination(): boolean {
    return this._destination != null
  }

  public setCurrentDestination(destination: Destination): void {
    this._destination = destination
    this._spline = null
    this._distanceTraveled = 0
  }

  public navigateTo(boundaryName: string, position: THREE.Vector3, direction: THREE.Vector3): void {
    const startBoundary = this._isle.boundaryManager.getBoundaryFromPosition(this.roi.position.clone().add(new THREE.Vector3(0, 1, 0)))
    if (startBoundary == null) {
      throw new Error('No start boundary found')
    }
    const destinationBoundary = this._isle.boundaryManager.getBoundary(boundaryName)
    if (destinationBoundary == null) {
      throw new Error('No destination boundary found')
    }
    const graph = this._isle.boundaryManager.generateGraph()
    const startNode = graph.get(startBoundary)
    if (startNode == null) {
      throw new Error('No start node found')
    }
    const endNode = graph.get(destinationBoundary)
    if (endNode == null) {
      throw new Error('No end node found')
    }
    const queue: BoundaryGraphNode[] = [startNode]
    startNode.cost = { parent: startNode, cost: 0 }
    while (queue.length > 0) {
      const currentNode = queue.shift()
      if (currentNode?.cost == null) {
        throw new Error('No current node found or has no cost')
      }
      for (const neighbor of currentNode.neighbors) {
        if (!neighbor.edge.isTraversableFromFace(currentNode.boundary)) {
          continue
        }
        if (neighbor.node.cost == null || neighbor.node.cost.cost > currentNode.cost.cost + 1) {
          neighbor.node.cost = { parent: currentNode, cost: currentNode.cost.cost + 1 }
          if (!queue.includes(neighbor.node)) {
            queue.push(neighbor.node)
          }
        }
      }
    }
    const path: BoundaryGraphNode[] = []
    let currentNode: BoundaryGraphNode = endNode
    while (currentNode !== startNode) {
      path.unshift(currentNode)
      if (currentNode.cost == null) {
        throw new Error('No parent node found')
      }
      currentNode = currentNode.cost.parent
    }
    this._path = {
      destinations: [],
      finalPosition: position,
      finalDirection: direction,
    }
    let previousNode = startNode
    for (const node of path) {
      const edge = node.neighbors.find(n => n.node === previousNode)?.edge
      if (edge == null) {
        throw new Error('No edge found')
      }
      this._path.destinations.push({
        boundary: previousNode.boundary,
        edge,
        scale: 0.5,
      })
      previousNode = node
    }
    const nextDestination = this._path.destinations.shift()
    if (nextDestination == null) {
      this._destination = { boundary: destinationBoundary, edge: destinationBoundary.edges[0], scale: 0.5 }
      this._spline = this._calculateSpline({ forceDestination: position, forceDirection: direction })
      this._distanceTraveled = 0
      this._path = null
      this._finishingPath = true
      return
    }
    this._finishingPath = false
    this._destination = nextDestination
  }

  public routeLength(boundaryName: string, position: THREE.Vector3): number | null {
    const start = this._isle.boundaryManager.getBoundaryFromPosition(this.roi.position.clone().add(new THREE.Vector3(0, 1, 0)))
    const end = this._isle.boundaryManager.getBoundary(boundaryName)
    if (start == null || end == null) {
      return null
    }
    const graph = this._isle.boundaryManager.generateGraph()
    const costs = new Map<Boundary, { distance: number; point: THREE.Vector3 }>([[start, { distance: 0, point: this.roi.position.clone() }]])
    const pending = [start]
    while (pending.length > 0) {
      pending.sort((a, b) => (costs.get(a)?.distance ?? Number.POSITIVE_INFINITY) - (costs.get(b)?.distance ?? Number.POSITIVE_INFINITY))
      const current = pending.shift()
      if (current == null) {
        break
      }
      const cost = costs.get(current)
      if (cost == null) {
        break
      }
      if (current === end) {
        return cost.distance + cost.point.distanceTo(position)
      }
      for (const next of graph.get(current)?.neighbors ?? []) {
        if (!next.edge.isTraversableFromFace(current)) {
          continue
        }
        const point = next.edge.pointA.clone().lerp(next.edge.pointB, 0.5)
        const distance = cost.distance + cost.point.distanceTo(point)
        if (distance < (costs.get(next.node.boundary)?.distance ?? Number.POSITIVE_INFINITY)) {
          costs.set(next.node.boundary, { distance, point })
          if (!pending.includes(next.node.boundary)) {
            pending.push(next.node.boundary)
          }
        }
      }
    }
    return null
  }
  public tryNavigateTo(boundaryName: string, position: THREE.Vector3, direction: THREE.Vector3): { length: number } | null {
    const length = this.routeLength(boundaryName, position)
    if (length == null) {
      return null
    }
    this.navigateTo(boundaryName, position, direction)
    this.faceTowards(this._path?.destinations[0]?.edge.pointA.clone().lerp(this._path.destinations[0].edge.pointB, 0.5) ?? position)
    if (!this._finishingPath) {
      this._spline = null
    }
    return { length }
  }
  public faceTowards(point: THREE.Vector3): void {
    const z = this.roi.position.clone().sub(point).normalize()
    if (z.lengthSq() < 0.0001) {
      return
    }
    const x = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), z).normalize()
    const y = new THREE.Vector3().crossVectors(z, x).normalize()
    this.roi.moveRoiTo(this.roi.position, new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)))
  }
  protected clearPath(): void {
    this._path = null
    this._finishingPath = false
    this._destination = null
    this._spline = null
  }
  public get hasArrived(): boolean {
    return !this.isFollowingPath && this._destination == null
  }

  protected chooseEdge(edges: Edge[]): Edge | undefined {
    return edges[0]
  }

  protected _switchBoundary(): void {
    if (this._path != null) {
      const nextDestination = this._path.destinations.shift()
      if (nextDestination == null) {
        this._spline = this._calculateSpline({ forceDestination: this._path.finalPosition, forceDirection: this._path.finalDirection })
        this._distanceTraveled = 0
        this._path = null
        this._finishingPath = true
        return
      }
      this._destination = nextDestination
      this._spline = this._calculateSpline()
      this._distanceTraveled = 0
      return
    }

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
    const useAll = (nextBoundary.flags & 1) === 0
    const eligible = (candidate: Edge): boolean => {
      if (!candidate.isTraversable()) {
        return false
      }
      const target = candidate.faceA === nextBoundary ? candidate.faceB : candidate.faceA
      return target != null && (useAll || (target.flags & 1) !== 0)
    }
    const edges: Edge[] = []
    do {
      edge = edge.getCCWEdge(nextBoundary)
      if (eligible(edge)) {
        edges.push(edge)
      }
    } while (edge !== this.destination.edge)
    edge = this.chooseEdge(edges.filter(candidate => candidate !== this.destination.edge)) ?? this.destination.edge

    this._destination = {
      boundary: nextBoundary,
      edge,
      scale: this.destination.scale,
    }

    this._spline = this._calculateSpline()
    this._distanceTraveled = 0
  }

  protected _calculateSpline({ forceDistance, forceDestination, forceDirection }: { forceDistance?: number; forceDestination?: THREE.Vector3; forceDirection?: THREE.Vector3 } = {}): THREE.CubicBezierCurve3 {
    const boundaryUp = this.destination.boundary.normal
    const startDirection = this.roi.getWorldDirection(new THREE.Vector3())
    let destination = forceDestination
    if (forceDestination == null) {
      const startRight = new THREE.Vector3().crossVectors(boundaryUp, startDirection).normalize()
      startDirection.crossVectors(startRight, boundaryUp).normalize()
      destination = this.destination.edge.getCWVertex(this.destination.boundary).clone().lerp(this.destination.edge.getCCWVertex(this.destination.boundary), this.destination.scale)
    }
    if (destination == null) {
      throw new Error('Destination not set')
    }
    const start = this.roi.position.clone()
    const destinationDirection = forceDirection == null ? boundaryUp.clone().cross(this.destination.edge.getFaceNormal(this.destination.boundary)) : forceDirection.clone()
    const distance = start.distanceTo(destination)
    const c1 = start.clone().sub(startDirection.divideScalar(3).multiplyScalar(forceDistance ?? distance))
    const c2 = destination.clone().add(destinationDirection.divideScalar(3).multiplyScalar(forceDistance ?? distance))
    const curve = new THREE.CubicBezierCurve3(start, c1, c2, destination)

    if (start.distanceTo(destination) < 0.5) {
      console.log('Start and destination are too close', this.destination)
    }

    return curve
  }

  public override resume(): void {
    super.resume()
    if (!this.suspended) {
      this._spline = null
      this._distanceTraveled = 0
    }
  }

  protected get useArcLength(): boolean {
    return true
  }

  public override update(delta: number): { from: THREE.Vector3; to: THREE.Vector3 } {
    super.update(delta)

    if (this._speed <= 0 || !this.hasDestination()) {
      this.updateAnimation(delta)
      return { from: this.roi.position.clone(), to: this.roi.position.clone() }
    }

    this.roi.visible = true

    if (this._spline == null) {
      this._spline = this._calculateSpline()
      this._distanceTraveled = 0
    }

    this._distanceTraveled = pathFraction(this._distanceTraveled, delta, this._speed, this.useArcLength ? this._spline.getLength() : this._spline.v0.distanceTo(this._spline.v3))

    const distancedTraveledClamped = Math.min(this._distanceTraveled, 1)
    const matrix = new THREE.Matrix4()
    const worldUp = this.destination.boundary.normal
    const dir = (this.useArcLength ? this._spline.getTangentAt(distancedTraveledClamped) : this._spline.getTangent(distancedTraveledClamped)).multiplyScalar(-1).normalize()
    const right = new THREE.Vector3().crossVectors(worldUp, dir).normalize()
    const up = new THREE.Vector3().crossVectors(dir, right).normalize()
    matrix.makeBasis(right, up, dir)
    const quaternion = new THREE.Quaternion()
    quaternion.setFromRotationMatrix(matrix)
    const from = this.roi.position.clone()
    const to = this.useArcLength ? this._spline.getPointAt(distancedTraveledClamped) : this._spline.getPoint(distancedTraveledClamped)
    this.roi.moveRoiTo(to, quaternion)

    if (this._distanceTraveled >= 1) {
      if (this._finishingPath) {
        this._finishingPath = false
        this._destination = null
        this._spline = null
        this._speed = 0
      } else {
        this._switchBoundary()
      }
    }

    this.updateAnimation(delta)

    return { from, to }
  }
}
