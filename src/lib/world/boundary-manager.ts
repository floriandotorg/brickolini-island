import * as THREE from 'three'
import type { Boundary, Edge } from '../assets/boundary'
import type { Roi3D } from '../assets/model'
import { engine } from '../engine'
import type { World } from './world'

const flagsColor = (edge: { flags: number }): string => {
  const red = edge.flags & 0b001 ? 'ff' : '00'
  const green = edge.flags & 0b010 ? 'ff' : '00'
  const blue = edge.flags & 0b100 ? 'ff' : '00'
  return `#${red}${green}${blue}`
}

export type BoundaryGraphNode = {
  boundary: Boundary
  neighbors: { node: BoundaryGraphNode; edge: Edge }[]
  cost: { parent: BoundaryGraphNode; cost: number } | null
}

export type BoundaryGraph = Map<Boundary, BoundaryGraphNode>

export class BoundaryManager {
  private _boundaries: Boundary[] = []
  private _meshToBoundary = new Map<THREE.Mesh, { boundary: Boundary; debugMesh: THREE.Mesh }>()
  private _wallGroup = new THREE.Group()
  private _boundaryGroup = new THREE.Group()
  private _currentBoundary: Boundary | null = null

  private _triggerListeners: Array<(name: string, data: number, direction: 'inbound' | 'outbound', roi: Roi3D | null) => void> = []

  public onTrigger(listener: (name: string, data: number, direction: 'inbound' | 'outbound', roi: Roi3D | null) => void): void {
    this._triggerListeners.push(listener)
  }

  constructor(private readonly _world: World) {}

  public loadBoundaries(boundaries: Boundary[]): void {
    this._boundaries = boundaries

    for (const boundary of this._boundaries) {
      const mesh = boundary.createMesh()
      const debugMesh = mesh.clone()
      debugMesh.position.y += 0.01
      this._world.debugDrawDebugMesh(debugMesh, flagsColor(boundary))
      this._boundaryGroup.add(mesh)
      this._meshToBoundary.set(mesh, { boundary, debugMesh })

      this._world.debugDrawText(boundary.edges[0].pointA.clone().add(new THREE.Vector3(1, 1, 1)), boundary.name, 'white')

      for (let n = 0; n < boundary.edges.length; ++n) {
        const edge = boundary.edges[n]
        this._world.debugDrawArrow(edge.pointA, edge.pointB, flagsColor(edge))

        if (!(edge.flags & 0x03)) {
          const p0 = edge.pointA.clone().sub(new THREE.Vector3(0, 1, 0))
          const p1 = edge.pointB.clone().sub(new THREE.Vector3(0, 1, 0))
          const p2 = edge.pointB.clone().add(new THREE.Vector3(0, 2, 0))
          const p3 = edge.pointA.clone().add(new THREE.Vector3(0, 2, 0))

          const geometry = new THREE.BufferGeometry()
          geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z, p0.x, p0.y, p0.z]), 3))
          geometry.computeVertexNormals()

          const material = new THREE.MeshStandardMaterial({ visible: false })
          const wall = new THREE.Mesh(geometry, material)

          this._wallGroup.add(wall)
        }
      }
    }
  }

  public get walls(): THREE.Group {
    return this._wallGroup
  }

  public generateGraph(): BoundaryGraph {
    const graph: BoundaryGraph = new Map()

    for (const boundary of this._boundaries) {
      graph.set(boundary, { boundary, neighbors: [], cost: null })
    }

    for (const boundary of this._boundaries) {
      const node = graph.get(boundary)
      if (node == null) {
        continue
      }
      for (const edge of boundary.edges) {
        if (edge.faceA != null && edge.faceB != null) {
          const neighbor = edge.faceA === boundary ? edge.faceB : edge.faceA
          const neighborNode = graph.get(neighbor)
          if (neighborNode != null && !node.neighbors.some(n => n.node === neighborNode)) {
            node.neighbors.push({ node: neighborNode, edge })
          }
        }
      }
    }

    return graph
  }

  public getBoundary(boundaryName: string): Boundary | null {
    return this._boundaries.find(b => b.name?.toLowerCase() === boundaryName.toLowerCase()) ?? null
  }

  public getObjectPlacement(
    boundaryName: string,
    src: number,
    srcScale: number,
    dst: number,
    _dstScale: number,
  ): {
    position: THREE.Vector3
    quaternion: THREE.Quaternion
    boundary: Boundary
    destinationEdge: Edge
  } {
    const boundary = this.getBoundary(boundaryName)
    if (boundary == null) {
      throw new Error(`Boundary ${boundaryName} not found`)
    }
    const { matrix, destinationEdge } = boundary.getActorPlacement(src, srcScale, dst, _dstScale)
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    matrix.decompose(position, quaternion, scale)
    if (scale.x > 1.001 || scale.x < 0.9999 || scale.y > 1.001 || scale.y < 0.9999 || scale.z > 1.001 || scale.z < 0.9999) {
      throw new Error('Object scale must be 1')
    }
    return { position, quaternion, boundary, destinationEdge }
  }

  public getBoundaryFromPosition(position: THREE.Vector3): Boundary | null {
    const downRay = new THREE.Raycaster(position, new THREE.Vector3(0, -1, 0), 0, 1000)
    const hit = downRay.intersectObject(this._boundaryGroup)[0]
    if (hit == null) {
      return null
    }
    const { boundary } = this._meshToBoundary.get(hit.object as THREE.Mesh) ?? {}
    return boundary ?? null
  }

  public update(fromPos: THREE.Vector3, toPos: THREE.Vector3, roi: Roi3D | null): void {
    const downRay = new THREE.Raycaster(toPos, new THREE.Vector3(0, -1, 0), 0, 1000)
    const hit = downRay.intersectObject(this._boundaryGroup)[0]
    if (hit) {
      const { boundary, debugMesh } = this._meshToBoundary.get(hit.object as THREE.Mesh) ?? {}
      this._currentBoundary = boundary ?? null
      if (debugMesh != null) {
        for (const { debugMesh } of this._meshToBoundary.values()) {
          debugMesh.visible = false
        }
        debugMesh.visible = true
      }

      if (engine.debugMode) {
        hit.object.visible = true
      }
    }

    if (this._currentBoundary?.direction != null && this._currentBoundary.triggers.length > 0) {
      const ccw = this._currentBoundary.edges[0].getCCWVertex(this._currentBoundary)

      const dot1 = fromPos.clone().sub(ccw).dot(this._currentBoundary.direction)
      const dot2 = toPos.clone().sub(ccw).dot(this._currentBoundary.direction)

      for (const trigger of this._currentBoundary.triggers) {
        if (dot2 > dot1 && trigger.triggerProjection >= dot1 && trigger.triggerProjection < dot2) {
          for (const listener of this._triggerListeners) {
            listener(trigger.struct.name, trigger.data, 'inbound', roi)
          }
        }

        if (dot2 < dot1 && trigger.triggerProjection >= dot2 && trigger.triggerProjection < dot1) {
          for (const listener of this._triggerListeners) {
            listener(trigger.struct.name, trigger.data, 'outbound', roi)
          }
        }
      }
    }
  }
}
