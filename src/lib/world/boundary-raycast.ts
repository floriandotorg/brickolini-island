import type * as THREE from 'three'
import { ObjectBVH, SAH } from 'three-mesh-bvh'

export class BoundaryRaycastIndex {
  private readonly _bvh: ObjectBVH | null
  private readonly _order = new Map<THREE.Object3D, number>()

  public constructor(meshes: THREE.Mesh[]) {
    for (let n = 0; n < meshes.length; ++n) {
      meshes[n].updateWorldMatrix(true, false)
      this._order.set(meshes[n], n)
    }
    this._bvh = meshes.length === 0 ? null : new ObjectBVH(meshes, { strategy: SAH, verbose: false })
  }

  public intersect(raycaster: THREE.Raycaster): THREE.Intersection[] {
    const hits: THREE.Intersection[] = []
    this._bvh?.shapecast({
      intersectsBounds: box => raycaster.ray.intersectsBox(box),
      intersectsObject: object => {
        if (object.layers.test(raycaster.layers)) {
          object.raycast(raycaster, hits)
        }
      },
    })
    return hits.sort((a, b) => a.distance - b.distance || (this._order.get(a.object) ?? 0) - (this._order.get(b.object) ?? 0) || (a.faceIndex ?? 0) - (b.faceIndex ?? 0))
  }
}
