import * as THREE from 'three'
import type { BoundaryAction } from '../action-types'
import { BinaryReader } from './binary-reader'
import { getAction } from './load'

type Struct = {
  name: string
  flags: number
}

type FaceInfo = {
  faceBoundaryIndex: number
  ccwEdgeIndex: number
  cwEdgeIndex: number
}

export class Edge {
  public flags: number
  public pointA: THREE.Vector3
  public pointB: THREE.Vector3
  public faceInfoA?: FaceInfo
  public faceInfoB?: FaceInfo
  public faceA?: Boundary
  public faceB?: Boundary
  public ccwEdgeA?: Edge
  public cwEdgeA?: Edge
  public ccwEdgeB?: Edge
  public cwEdgeB?: Edge
  public direction: THREE.Vector3
  public unknown2: number

  constructor(flags: number, pointA: THREE.Vector3, pointB: THREE.Vector3, faceInfoA: FaceInfo | undefined, faceInfoB: FaceInfo | undefined, direction: THREE.Vector3, unknown2: number) {
    this.flags = flags
    this.pointA = pointA
    this.pointB = pointB
    this.faceInfoA = faceInfoA
    this.faceInfoB = faceInfoB
    this.direction = direction
    this.unknown2 = unknown2
  }

  public getCWVertex(face: Boundary): THREE.Vector3 {
    if (this.faceA === face) {
      return this.pointB
    }
    if (this.faceB === face) {
      return this.pointA
    }
    throw new Error('getCWVertex: Face not found')
  }

  public getCCWVertex(face: Boundary): THREE.Vector3 {
    if (this.faceA === face) {
      return this.pointA
    }
    if (this.faceB === face) {
      return this.pointB
    }
    throw new Error('getCCWVertex: Face not found')
  }

  public getCWEdge(face: Boundary): Edge {
    if (this.faceA === face) {
      if (this.cwEdgeA == null) {
        throw new Error('getCWEdge: cwEdgeA not found')
      }
      return this.cwEdgeA
    }
    if (this.faceB === face) {
      if (this.cwEdgeB == null) {
        throw new Error('getCWEdge: cwEdgeB not found')
      }
      return this.cwEdgeB
    }
    throw new Error('getCWEdge: Face not found')
  }

  public getCCWEdge(face: Boundary): Edge {
    if (this.faceA === face) {
      if (this.ccwEdgeA == null) {
        throw new Error('getCCWEdge: ccwEdgeB not found')
      }
      return this.ccwEdgeA
    }
    if (this.faceB === face) {
      if (this.ccwEdgeB == null) {
        throw new Error('getCCWEdge: ccwEdgeA not found')
      }
      return this.ccwEdgeB
    }
    throw new Error('getCCWEdge: Face not found')
  }

  public connectFaces(edges: Edge[], boundaries: Boundary[]) {
    if (this.faceInfoA) {
      this.faceA = boundaries[this.faceInfoA.faceBoundaryIndex]
      this.ccwEdgeA = edges[this.faceInfoA.ccwEdgeIndex]
      this.cwEdgeA = edges[this.faceInfoA.cwEdgeIndex]

      if (this.faceA == null || this.ccwEdgeA == null || this.cwEdgeA == null) {
        throw new Error('Face or edge not found')
      }
    }

    if (this.faceInfoB) {
      this.faceB = boundaries[this.faceInfoB.faceBoundaryIndex]
      this.ccwEdgeB = edges[this.faceInfoB.ccwEdgeIndex]
      this.cwEdgeB = edges[this.faceInfoB.cwEdgeIndex]

      if (this.faceB == null || this.ccwEdgeB == null || this.cwEdgeB == null) {
        throw new Error('Face or edge not found')
      }
    }
  }
}

type PathTrigger = {
  struct: Struct
  data: number
  triggerProjection: number
}

export class Boundary {
  public name: string
  public edges: Edge[]
  public flags: number
  public unknown: number
  public up: THREE.Vector4
  public planes: THREE.Vector4[]
  public unknownVec3: THREE.Vector3
  public unknownFloat: number
  public triggers: PathTrigger[]
  public direction?: THREE.Vector3
  public mesh: THREE.Mesh | null = null

  constructor(name: string, edges: Edge[], flags: number, unknown: number, up: THREE.Vector4, planes: THREE.Vector4[], unknownVec3: THREE.Vector3, unknownFloat: number, triggers: PathTrigger[], direction?: THREE.Vector3) {
    this.name = name
    this.edges = edges
    this.flags = flags
    this.unknown = unknown
    this.up = up
    this.planes = planes
    this.unknownVec3 = unknownVec3
    this.unknownFloat = unknownFloat
    this.triggers = triggers
    this.direction = direction
    this.mesh = null
  }

  public createMesh(): THREE.Mesh {
    if (this.mesh) {
      return this.mesh
    }

    if (this.edges.length < 3) {
      throw new Error('Boundary must have at least 3 edges')
    }

    const vertices = []
    const v0 = this.edges[0].getCCWVertex(this).toArray()
    const seq = [v0]
    let e = this.edges[0]
    for (let n = 0; n < this.edges.length - 1; ++n) {
      seq.push(e.getCWVertex(this).toArray())
      e = e.getCWEdge(this)
    }
    for (let n = 1; n < seq.length - 1; ++n) {
      vertices.push(...v0)
      vertices.push(...seq[n])
      vertices.push(...seq[n + 1])
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
    geometry.computeVertexNormals()

    const material = new THREE.MeshLambertMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.visible = false

    return this.mesh
  }

  public getActorPlacement(src: number, srcScale: number, dst: number, _dstScale: number): THREE.Matrix4 {
    const srcEdge = this.edges[src]
    const dstEdge = this.edges[dst]
    if (srcEdge == null || dstEdge == null) {
      throw new Error('Edge not found')
    }

    const v1 = srcEdge?.pointA
    const v2 = srcEdge?.pointB
    const v3 = dstEdge?.pointA
    const v4 = dstEdge?.pointB
    if (v1 == null || v2 == null || v3 == null || v4 == null) {
      throw new Error('Edge not found')
    }

    const p1: THREE.Vector3 = v2.clone()
    p1.sub(v1)
    p1.multiplyScalar(srcScale)
    p1.add(v1)

    const p2: THREE.Vector3 = v4.clone()
    p2.sub(v3)
    p2.multiplyScalar(0.5)
    p2.add(v3)

    const dir = p2.clone()
    dir.sub(p1)
    dir.normalize()
    dir.multiplyScalar(-1)

    const right = new THREE.Vector3(this.up.x, this.up.y, this.up.z).cross(dir)
    const matrix = new THREE.Matrix4()
    matrix.set(right.x, this.up.x, dir.x, p1.x, right.y, this.up.y, dir.y, p1.y, right.z, this.up.z, dir.z, p1.z, 0, 0, 0, 1)
    return matrix
  }
}

export const getBoundaries = async (action: BoundaryAction): Promise<Boundary[]> => {
  const reader = new BinaryReader(await getAction(action))
  const numStructs = reader.readUint16()
  const numNodes = reader.readUint16()
  const numEdges = reader.readUint16()
  const numBoundaries = reader.readUint16()

  const structs: Struct[] = []
  for (let n = 0; n < numStructs; ++n) {
    structs.push({ name: reader.readString('u8'), flags: reader.readUint32() })
  }

  const location = new THREE.Vector3(action.location[0], action.location[1], action.location[2])
  const nodes: THREE.Vector3[] = []
  for (let n = 0; n < numNodes; ++n) {
    nodes.push(new THREE.Vector3(...reader.readVector3()).add(location))
  }

  const getNode = (index: number) => {
    if (index >= nodes.length) {
      throw new Error(`Node index out of bounds: ${index} >= ${nodes.length} (${name})`)
    }
    return nodes[index]
  }

  const edges: Edge[] = []
  for (let n = 0; n < numEdges; ++n) {
    edges.push(new Edge(reader.readUint16(), getNode(reader.readUint16()), getNode(reader.readUint16()), undefined, undefined, new THREE.Vector3(), 0))

    if (edges[n].flags & 0x04) {
      edges[n].faceInfoA = {
        faceBoundaryIndex: reader.readUint16(),
        ccwEdgeIndex: reader.readUint16(),
        cwEdgeIndex: reader.readUint16(),
      }
    }

    if (edges[n].flags & 0x08) {
      edges[n].faceInfoB = {
        faceBoundaryIndex: reader.readUint16(),
        ccwEdgeIndex: reader.readUint16(),
        cwEdgeIndex: reader.readUint16(),
      }
    }

    edges[n].direction = new THREE.Vector3(...reader.readVector3())
    edges[n].unknown2 = reader.readFloat32()
  }

  const boundaries: Boundary[] = []
  for (let n = 0; n < numBoundaries; ++n) {
    const numEdges = reader.readUint8()
    const boundaryEdges: Edge[] = []
    for (let n = 0; n < numEdges; ++n) {
      const idx = reader.readUint16()
      if (idx >= edges.length) {
        throw new Error(`Edge index out of bounds: ${idx} >= ${edges.length}`)
      }
      boundaryEdges.push(edges[idx])
    }
    const flags = reader.readUint8()
    const unknown = reader.readUint8()
    const name = reader.readString('u8')
    const up = new THREE.Vector4(...reader.readVector4())
    const unknowns: THREE.Vector4[] = []
    for (let n = 0; n < numEdges; ++n) {
      unknowns.push(new THREE.Vector4(...reader.readVector4()))
    }
    const unknownVec3 = new THREE.Vector3(...reader.readVector3()) // unknown
    const unknownFloat = reader.readFloat32() // unknown
    const numTriggers = reader.readUint8()
    let direction: THREE.Vector3 | undefined
    const triggers: PathTrigger[] = []
    if (numTriggers > 0) {
      for (let n = 0; n < numTriggers; ++n) {
        triggers.push({
          struct: structs[reader.readUint16()],
          data: reader.readUint32(),
          triggerProjection: reader.readFloat32(),
        })
      }
      direction = new THREE.Vector3(...reader.readVector3())
    }
    const boundary = new Boundary(name, boundaryEdges, flags, unknown, up, unknowns, unknownVec3, unknownFloat, triggers, direction)
    boundaries.push(boundary)
  }

  for (const boundary of boundaries) {
    for (const edge of boundary.edges) {
      edge.connectFaces(edges, boundaries)
    }
  }

  return boundaries
}
