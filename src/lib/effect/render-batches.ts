import * as THREE from 'three'

type BatchMaterial = THREE.MeshBasicMaterial | THREE.MeshLambertMaterial | THREE.MeshPhysicalMaterial

type Source = {
  mesh: THREE.Mesh<THREE.BufferGeometry, BatchMaterial>
  material: BatchMaterial
  map: THREE.Texture | null
  version: number
  geometry: THREE.BufferGeometry
  instance: number
  layers: number
  matrix: THREE.Matrix4
  color: THREE.Color
}

type Batch = { mesh: THREE.BatchedMesh; sources: Source[] }

const eligible = (object: THREE.Object3D): object is THREE.Mesh<THREE.BufferGeometry, BatchMaterial> =>
  object instanceof THREE.Mesh &&
  !(object instanceof THREE.SkinnedMesh) &&
  !(object instanceof THREE.InstancedMesh) &&
  !(object instanceof THREE.BatchedMesh) &&
  (object.material instanceof THREE.MeshBasicMaterial || object.material instanceof THREE.MeshLambertMaterial || object.material instanceof THREE.MeshPhysicalMaterial) &&
  !object.material.transparent &&
  object.material.opacity === 1 &&
  (!(object.material instanceof THREE.MeshPhysicalMaterial) || object.material.normalMap == null) &&
  Object.keys(object.geometry.morphAttributes).length === 0 &&
  object.frustumCulled &&
  object.customDepthMaterial == null &&
  object.customDistanceMaterial == null &&
  object.material.clippingPlanes == null &&
  object.material.onBeforeCompile === THREE.Material.prototype.onBeforeCompile &&
  object.geometry.groups.length === 0 &&
  object.geometry.drawRange.start === 0 &&
  object.geometry.drawRange.count === Number.POSITIVE_INFINITY &&
  object.onBeforeRender === THREE.Object3D.prototype.onBeforeRender &&
  object.onBeforeShadow === THREE.Object3D.prototype.onBeforeShadow

const signature = (mesh: THREE.Mesh<THREE.BufferGeometry, BatchMaterial>): string => {
  const material = Object.entries(mesh.material)
    .filter(([key]) => !['uuid', 'name', 'color', 'version', 'userData', '_listeners'].includes(key))
    .map(([key, value]) => [key, value instanceof THREE.Texture ? value.uuid : value])
  const attributes = Object.entries(mesh.geometry.attributes).map(([key, attribute]) => [key, attribute.itemSize, attribute.normalized, attribute.array.constructor.name])
  return JSON.stringify([material, attributes, mesh.geometry.index != null, mesh.castShadow, mesh.receiveShadow, mesh.renderOrder, mesh.layers.mask])
}

export class RenderBatches {
  private readonly _seen = new WeakSet<THREE.Object3D>()
  private readonly _batches: Batch[] = []
  private readonly _hidden: Source[] = []
  private _scene: THREE.Scene | null = null
  private _matrixWorldAutoUpdate = true

  public prepare(scene: THREE.Scene): void {
    this._scene = scene
    this._matrixWorldAutoUpdate = scene.matrixWorldAutoUpdate
    scene.updateMatrixWorld()
    const groups = new Map<string, THREE.Mesh<THREE.BufferGeometry, BatchMaterial>[]>()
    scene.traverse(object => {
      if (this._seen.has(object) || !eligible(object)) {
        return
      }
      this._seen.add(object)
      const key = signature(object)
      const group = groups.get(key)
      if (group == null) {
        groups.set(key, [object])
      } else {
        group.push(object)
      }
    })
    for (const meshes of groups.values()) {
      if (meshes.length < 2) {
        continue
      }
      this._create(scene, meshes)
    }
    for (const batch of this._batches) {
      batch.mesh.visible = true
      for (const source of batch.sources) {
        const { mesh, material, geometry, instance } = source
        const compatible =
          mesh.material === material &&
          mesh.geometry === geometry &&
          material.version === source.version &&
          !material.transparent &&
          material.opacity === 1 &&
          material.map === source.map &&
          mesh.layers.mask === batch.mesh.layers.mask &&
          mesh.castShadow === batch.mesh.castShadow &&
          mesh.receiveShadow === batch.mesh.receiveShadow &&
          mesh.renderOrder === batch.mesh.renderOrder
        let visible = compatible && material.visible
        let parent: THREE.Object3D | null = mesh
        while (parent != null && parent !== scene) {
          visible &&= parent.visible
          parent = parent.parent
        }
        visible &&= parent === scene
        batch.mesh.setVisibleAt(instance, visible)
        if (visible) {
          if (!source.matrix.equals(mesh.matrixWorld)) {
            batch.mesh.setMatrixAt(instance, mesh.matrixWorld)
            source.matrix.copy(mesh.matrixWorld)
          }
          if (!source.color.equals(material.color)) {
            batch.mesh.setColorAt(instance, material.color)
            source.color.copy(material.color)
          }
        }
        if (compatible) {
          source.layers = mesh.layers.mask
          mesh.layers.mask = 0
          this._hidden.push(source)
        }
      }
    }
    scene.matrixWorldAutoUpdate = false
  }

  private _create(scene: THREE.Scene, meshes: THREE.Mesh<THREE.BufferGeometry, BatchMaterial>[]): void {
    const geometries = new Set(meshes.map(mesh => mesh.geometry))
    let vertices = 0
    let indices = 0
    for (const geometry of geometries) {
      vertices += geometry.getAttribute('position').count
      indices += geometry.index?.count ?? 0
    }
    const material = meshes[0].material.clone()
    material.color.set(0xffffff)
    const mesh = new THREE.BatchedMesh(meshes.length, vertices, indices, material)
    mesh.name = 'opaque-batch'
    mesh.raycast = () => {}
    mesh.castShadow = meshes[0].castShadow
    mesh.receiveShadow = meshes[0].receiveShadow
    mesh.renderOrder = meshes[0].renderOrder
    mesh.layers.mask = meshes[0].layers.mask
    mesh.matrixWorldAutoUpdate = false
    mesh.frustumCulled = false
    mesh.sortObjects = false
    const ids = new Map<THREE.BufferGeometry, number>()
    for (const geometry of geometries) {
      ids.set(geometry, mesh.addGeometry(geometry))
    }
    const sources = meshes.map(object => {
      const id = ids.get(object.geometry)
      if (id == null) {
        throw new Error('Missing batch geometry')
      }
      const instance = mesh.addInstance(id)
      mesh.setMatrixAt(instance, object.matrixWorld)
      mesh.setColorAt(instance, object.material.color)
      return { mesh: object, material: object.material, map: object.material.map, version: object.material.version, geometry: object.geometry, instance, layers: object.layers.mask, matrix: object.matrixWorld.clone(), color: object.material.color.clone() }
    })
    scene.add(mesh)
    this._batches.push({ mesh, sources })
  }

  public restore(): void {
    for (const source of this._hidden) {
      source.mesh.layers.mask = source.layers
    }
    this._hidden.length = 0
    for (const batch of this._batches) {
      batch.mesh.visible = false
    }
    if (this._scene != null) {
      this._scene.matrixWorldAutoUpdate = this._matrixWorldAutoUpdate
    }
  }

  public dispose(): void {
    this.restore()
    for (const batch of this._batches) {
      batch.mesh.removeFromParent()
      batch.mesh.dispose()
      batch.mesh.material.dispose()
    }
    this._batches.length = 0
  }
}
