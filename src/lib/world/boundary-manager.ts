import * as THREE from 'three'
import type { Boundary } from '../assets/boundary'
import { engine } from '../engine'

export class BoundaryManager {
  private _boundaries: Boundary[]
  private _meshToBoundary = new Map<THREE.Mesh, { boundary: Boundary; debugMesh: THREE.Mesh }>()
  private _wallGroup = new THREE.Group()
  private _boundaryGroup = new THREE.Group()
  private _currentBoundary: Boundary | null = null

  public onTrigger: (name: string, data: number, direction: 'inbound' | 'outbound') => void = () => {}

  constructor(boundaries: Boundary[]) {
    this._boundaries = boundaries

    for (const boundary of this._boundaries) {
      const mesh = boundary.createMesh()
      const debugMesh = mesh.clone()
      debugMesh.position.y += 0.01
      engine.currentWorld.debugDrawDebugMesh(debugMesh)
      this._boundaryGroup.add(mesh)
      this._meshToBoundary.set(mesh, { boundary, debugMesh })

      for (let n = 0; n < boundary.edges.length; ++n) {
        const edge = boundary.edges[n]
        engine.currentWorld.debugDrawArrow(edge.pointA, edge.pointB, edge.flags & 0x02 ? 'red' : 'blue')

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

  public placeObject(object: THREE.Object3D, boundaryName: string, src: number, srcScale: number, dst: number, _dstScale: number): void {
    const boundary = this._boundaries.find(b => b.name === boundaryName)
    if (boundary == null) {
      throw new Error(`Boundary ${boundaryName} not found`)
    }
    const matrix = boundary.getActorPlacement(src, srcScale, dst, _dstScale)
    matrix.decompose(object.position, object.quaternion, object.scale)
  }

  public update(fromPos: THREE.Vector3, toPos: THREE.Vector3): void {
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

      if (engine.currentWorld.debugMode) {
        hit.object.visible = true
      }
    }

    if (this._currentBoundary?.direction != null && this._currentBoundary.triggers.length > 0) {
      const ccw = this._currentBoundary.edges[0].getCCWVertex(this._currentBoundary)

      const dot1 = fromPos.clone().sub(ccw).dot(this._currentBoundary.direction)
      const dot2 = toPos.clone().sub(ccw).dot(this._currentBoundary.direction)

      for (const trigger of this._currentBoundary.triggers) {
        if (dot2 > dot1 && trigger.triggerProjection >= dot1 && trigger.triggerProjection < dot2) {
          this.onTrigger(trigger.struct.name, trigger.data, 'inbound')
        }

        if (dot2 < dot1 && trigger.triggerProjection >= dot2 && trigger.triggerProjection < dot1) {
          this.onTrigger(trigger.struct.name, trigger.data, 'outbound')
        }
      }
    }
  }
}
