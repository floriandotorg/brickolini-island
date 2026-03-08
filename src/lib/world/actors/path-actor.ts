import * as THREE from 'three'
import type { Boundary, Edge } from '../../assets/boundary'
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

  public get isFollowingPath(): boolean {
    return this._path != null
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

  public setCurrentDestination(destination: Destination): void {
    this._destination = destination
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
      throw new Error('No next destination found')
    }
    this._destination = nextDestination
  }

  protected _switchBoundary(): void {
    if (this._path != null) {
      const nextDestination = this._path.destinations.shift()
      if (nextDestination == null) {
        this._spline = this._calculateSpline({ forceDestination: this._path.finalPosition, forceDirection: this._path.finalDirection })
        this._distanceTraveled = 0
        this._path = null
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

  protected _calculateSpline({ forceDistance, forceDestination, forceDirection }: { forceDistance?: number; forceDestination?: THREE.Vector3; forceDirection?: THREE.Vector3 } = {}): THREE.CubicBezierCurve3 {
    const boundaryUp = new THREE.Vector3(-this.destination.boundary.up.x, this.destination.boundary.up.y, this.destination.boundary.up.z)
    const startDirection = this.roi.model.getWorldDirection(new THREE.Vector3())
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

  public override update(delta: number): { from: THREE.Vector3; to: THREE.Vector3 } {
    super.update(delta)

    if (this._speed <= 0) {
      return { from: this.roi.position.clone(), to: this.roi.position.clone() }
    }

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

    if (this._distanceTraveled >= 1) {
      this._switchBoundary()
    }

    return { from, to }
  }
}
