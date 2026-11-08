import * as THREE from 'three'
import { acceleratedRaycast, MeshBVH, SAH } from 'three-mesh-bvh'

const prepareGeometry = (geometry: THREE.BufferGeometry): void => {
  const count = geometry.index?.count ?? geometry.getAttribute('position')?.count ?? 0
  if (count >= 768 && geometry.boundsTree == null && Object.keys(geometry.morphAttributes).length === 0) {
    geometry.boundsTree = new MeshBVH(geometry, { strategy: SAH, indirect: true, verbose: false })
  }
}

export class RaycastMesh extends THREE.Mesh<THREE.BufferGeometry, THREE.Material> {
  public constructor(geometry: THREE.BufferGeometry = new THREE.BufferGeometry(), material: THREE.Material = new THREE.MeshBasicMaterial()) {
    super(geometry, material)
    prepareGeometry(geometry)
  }

  public override raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void {
    prepareGeometry(this.geometry)
    if (this.geometry.boundsTree == null) {
      super.raycast(raycaster, intersects)
      return
    }
    const hits: THREE.Intersection[] = []
    acceleratedRaycast.call(this, raycaster, hits)
    hits.sort((a, b) => (a.faceIndex ?? 0) - (b.faceIndex ?? 0))
    for (const hit of hits) {
      intersects.push(hit)
    }
  }
}
