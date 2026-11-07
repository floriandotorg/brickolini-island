import * as THREE from 'three'
import { Water } from 'three/addons/objects/Water.js'
import type { ModelAction } from '../action-types'
import { islandModelName, lodIndex } from '../model-quality'
import { getSettings } from '../settings'
import type { Actor } from '../world/actor'
import { createIslandWater } from '../world/water.ts'
import { BinaryReader } from './binary-reader'
import { getAction, getFile, getFileUrl } from './load'
import { colorFromName, createGeometryAndMaterials } from './mesh'
import { WDB } from './wdb'

let wdb: WDB.File | null = null

type CreatedMeshes = { meshes: THREE.Mesh[]; lod: WDB.Lod; texture: string | THREE.Texture | null; customColor: WDB.Color | null; type: 'model' | 'part' }
const createdMeshes: CreatedMeshes[] = []
const modelLods = new Map<RoiModel, { lods: readonly WDB.Lod[]; entry: CreatedMeshes }>()
let maximumLod: number | null = null
const selectLod = (lods: readonly WDB.Lod[]): WDB.Lod | undefined => lods[lodIndex(lods.length, maximumLod, getSettings().islandQuality)]
const trackLods = (model: RoiModel, lods: readonly WDB.Lod[], entry: CreatedMeshes): void => {
  createdMeshes.push(entry)
  modelLods.set(model, { lods, entry })
}
export const setMaximumLod = (maximum: number): void => {
  maximumLod = maximum
  for (const [model, { lods, entry }] of modelLods) {
    const lod = selectLod(lods)
    if (lod == null || lod === entry.lod || model.children.some(child => child instanceof Water)) {
      continue
    }
    const meshes = createGeometryAndMaterials(lod, entry.customColor, entry.texture, entry.type).map(([geometry, material], n) => {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.name = `${model.name}-${n + 1}`
      mesh.castShadow = getSettings().graphics.shadows
      mesh.receiveShadow = mesh.castShadow
      return mesh
    })
    model.remove(...entry.meshes)
    model.add(...meshes)
    const children = [...model.children]
    model.children.splice(0, model.children.length, ...meshes, ...children.filter(child => !meshes.some(mesh => mesh === child)))
    entry.meshes = meshes
    entry.lod = lod
    model.offsetIndex = lod.meshesBeforeOffset.length
  }
}
export const forgetModelLods = (object: THREE.Object3D): void => {
  object.traverse(child => {
    if (!(child instanceof RoiModel)) {
      return
    }
    const definition = modelLods.get(child)
    if (definition != null) {
      modelLods.delete(child)
      const index = createdMeshes.indexOf(definition.entry)
      if (index >= 0) {
        createdMeshes.splice(index, 1)
      }
    }
  })
}

if (import.meta.hot) {
  import.meta.hot.accept('./mesh', newModule => {
    if (newModule == null) {
      return
    }

    for (const { meshes, lod, texture, customColor, type } of createdMeshes) {
      const geometryAndMaterials = newModule.createGeometryAndMaterials(lod, customColor, texture, type)
      if (geometryAndMaterials.length !== meshes.length) {
        import.meta.hot?.invalidate()
        return
      }

      for (let n = 0; n < meshes.length; ++n) {
        const mesh = meshes[n]
        const [geometry, material] = geometryAndMaterials[n]
        mesh.geometry = geometry
        mesh.material = material
      }
    }
  })
}

const getWdb = async (): Promise<WDB.File> => {
  if (wdb == null) {
    wdb = new WDB.File(await getFile(getFileUrl('world.wdb')))
  }
  return wdb
}

export const getModel = async (action: ModelAction): Promise<Roi3D> => {
  const model = await getAction(action)
  const reader = new BinaryReader(model)
  const { roi, animation } = WDB.readModel(reader)
  return await roiToMesh(roi, [], animation.tree)
}

export const calculateTransformationMatrix = (location: readonly [number, number, number], direction: readonly [number, number, number], up: readonly [number, number, number], matrix?: THREE.Matrix4): THREE.Matrix4 => {
  const locationVector = new THREE.Vector3(...location)
  const dir = new THREE.Vector3(...direction)
  if (dir.lengthSq() === 0) {
    dir.set(0, 0, 1)
  }
  dir.normalize()
  const upV = new THREE.Vector3(...up)
  if (upV.lengthSq() === 0) {
    upV.set(0, 1, 0)
  }
  upV.normalize()
  let right = new THREE.Vector3().crossVectors(upV, dir)
  if (right.lengthSq() === 0) {
    const tmp = new THREE.Vector3(1, 0, 0)
    if (Math.abs(dir.x) > 0.9) {
      tmp.set(0, 1, 0)
    }
    right = new THREE.Vector3().crossVectors(tmp, dir)
  }
  right.normalize()
  const newUp = new THREE.Vector3().crossVectors(dir, right).normalize()
  const transformationMatrix = matrix ?? new THREE.Matrix4()
  transformationMatrix.makeBasis(right, newUp, dir)
  transformationMatrix.setPosition(locationVector)
  return transformationMatrix
}

export class RoiModel extends THREE.Group {
  private _roi3d: Roi3D | null = null
  public offsetIndex = 0
  public hasLod = false
  public boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0)
  public boundingBox: THREE.Box3 = new THREE.Box3()

  public set roi3d(value: Roi3D) {
    this._roi3d = value
  }

  public get roi3d(): Roi3D {
    if (this._roi3d == null) {
      throw new Error(`Roi3d for ${this.name} is not set`)
    }
    return this._roi3d
  }

  public get roi3dOrNull(): Roi3D | null {
    return this._roi3d
  }

  public getWorldBoundingSphere(): THREE.Sphere {
    this.updateWorldMatrix(true, false)
    return this.boundingSphere.clone().applyMatrix4(this._roi3d?.getWorldBoundsMatrix() ?? this.matrixWorld)
  }

  public getWorldBoundingBox(): THREE.Box3 {
    this.updateWorldMatrix(true, false)
    return this.boundingBox.clone().applyMatrix4(this._roi3d?.getWorldBoundsMatrix() ?? this.matrixWorld)
  }

  public override copy(object: THREE.Object3D, recursive?: boolean): this {
    super.copy(object, recursive)
    if (object instanceof RoiModel) {
      this.offsetIndex = object.offsetIndex
      this.hasLod = object.hasLod
      this.boundingSphere = object.boundingSphere.clone()
      this.boundingBox = object.boundingBox.clone()
      this._roi3d = null
      const definition = modelLods.get(object)
      if (definition != null) {
        trackLods(this, definition.lods, { ...definition.entry, meshes: this.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh) })
      }
    }
    return this
  }

  public static traverseWithOffset(object: THREE.Object3D, callback: (object: THREE.Object3D) => void): void {
    callback(object)
    const children = object instanceof RoiModel ? object.children.slice(object.offsetIndex) : object.children
    for (const child of children) {
      RoiModel.traverseWithOffset(child, callback)
    }
  }

  public traverseWithOffset(callback: (object: THREE.Object3D) => void): void {
    RoiModel.traverseWithOffset(this, callback)
  }
}

export class Roi3D {
  public children: Roi3D[] = []
  public parent: Roi3D | null = null
  public actor: Actor | null = null

  public constructor(
    public readonly model: RoiModel,
    public name: string,
  ) {
    model.roi3d = this
  }

  public addRoiChild(child: Roi3D): void {
    child.parent = this
    this.children.push(child)
  }

  public getAllModels(): RoiModel[] {
    return [this.model, ...this.children.flatMap(c => c.getAllModels())]
  }

  public getWorldBoundsMatrix(): THREE.Matrix4 {
    this.model.updateWorldMatrix(true, false)
    return this.model.matrixWorld
  }

  private _capturedModels: { object: THREE.Object3D; position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3; visible: boolean }[] | null = null

  public captureTransform(): void {
    this._capturedModels = this.getAllModels().map(object => ({ object, position: object.position.clone(), quaternion: object.quaternion.clone(), scale: object.scale.clone(), visible: object.visible }))
  }

  public restoreTransform(): void {
    for (const { object, position, quaternion, scale, visible } of this._capturedModels ?? []) {
      object.position.copy(position)
      object.quaternion.copy(quaternion)
      object.scale.copy(scale)
      object.visible = visible
    }
    this._capturedModels = null
  }

  public getAllRois(): Roi3D[] {
    const rois = new Set<Roi3D>([this])
    this.model.traverse(object => {
      if (object instanceof RoiModel && object.roi3dOrNull != null) {
        rois.add(object.roi3dOrNull)
      }
    })
    for (const child of this.children) {
      for (const roi of child.getAllRois()) {
        rois.add(roi)
      }
    }
    return [...rois]
  }

  public get position(): THREE.Vector3 {
    return this.model.position
  }

  public getWorldQuaternion(target = new THREE.Quaternion()): THREE.Quaternion {
    return this.model.getWorldQuaternion(target)
  }

  public getWorldDirection(target = new THREE.Vector3()): THREE.Vector3 {
    const quaternion = this.getWorldQuaternion(new THREE.Quaternion())
    return target.set(0, 0, 1).applyQuaternion(quaternion).normalize()
  }

  public set visible(value: boolean) {
    this.model.visible = value
    for (const roi of this.children) {
      roi.visible = value
    }
  }

  public clone(): Roi3D {
    const roi3d = new Roi3D(this.model.clone(), this.name)
    roi3d.children = this.children.map(c => c.clone())
    return roi3d
  }

  public moveRoiTo(targetPosition: THREE.Vector3, targetQuaternion?: THREE.Quaternion): void {
    const objects = this.getAllModels()
    for (const object of objects) {
      object.updateMatrixWorld(true)
    }

    const baseWorldPosition = new THREE.Vector3()
    const baseWorldQuaternion = new THREE.Quaternion()
    this.model.getWorldPosition(baseWorldPosition)
    this.model.getWorldQuaternion(baseWorldQuaternion)

    const newBaseQuaternion = targetQuaternion ? targetQuaternion.clone() : baseWorldQuaternion.clone()
    const inverseBaseQuaternion = baseWorldQuaternion.clone().invert()

    const relativeTransforms: { object: THREE.Object3D; relativePosition: THREE.Vector3; relativeQuaternion: THREE.Quaternion }[] = []
    for (const object of objects) {
      const worldPosition = new THREE.Vector3()
      const worldQuaternion = new THREE.Quaternion()
      object.getWorldPosition(worldPosition)
      object.getWorldQuaternion(worldQuaternion)

      worldPosition.sub(baseWorldPosition).applyQuaternion(inverseBaseQuaternion)
      worldQuaternion.premultiply(inverseBaseQuaternion)

      relativeTransforms.push({ object, relativePosition: worldPosition, relativeQuaternion: worldQuaternion })
    }

    const setWorldTransform = (object: THREE.Object3D, worldPosition: THREE.Vector3, worldQuaternion: THREE.Quaternion) => {
      const parent = object.parent
      if (parent) {
        parent.updateMatrixWorld(true)
        const parentWorldPosition = new THREE.Vector3()
        const parentWorldQuaternion = new THREE.Quaternion()
        parent.getWorldPosition(parentWorldPosition)
        parent.getWorldQuaternion(parentWorldQuaternion)
        const inverseParentQuaternion = parentWorldQuaternion.clone().invert()

        const localPosition = worldPosition.clone().sub(parentWorldPosition).applyQuaternion(inverseParentQuaternion)
        const localQuaternion = inverseParentQuaternion.clone().multiply(worldQuaternion)

        object.position.copy(localPosition)
        object.quaternion.copy(localQuaternion)
      } else {
        object.position.copy(worldPosition)
        object.quaternion.copy(worldQuaternion)
      }
      object.updateMatrix()
    }

    for (const { object, relativePosition, relativeQuaternion } of relativeTransforms) {
      const worldPosition = targetPosition.clone().add(relativePosition.clone().applyQuaternion(newBaseQuaternion))
      const worldQuaternion = newBaseQuaternion.clone().multiply(relativeQuaternion)
      setWorldTransform(object, worldPosition, worldQuaternion)
    }
  }
}

const roiToMesh = async (roi: WDB.Roi, parts: WDB.Part[], animation: WDB.Animation.Node | undefined, path: string[] = []): Promise<Roi3D> => {
  const roiModel = new RoiModel()
  const roi3d = new Roi3D(roiModel, roi.name.toLowerCase())
  roiModel.boundingSphere = new THREE.Sphere(new THREE.Vector3(...roi.boundingSphere.center), roi.boundingSphere.radius)
  roiModel.boundingBox = new THREE.Box3(new THREE.Vector3(...roi.boundingBox.min), new THREE.Vector3(...roi.boundingBox.max))
  roiModel.name = [...path, roi3d.name].join('_')
  roiModel.roi3d = roi3d

  if (animation) {
    if (animation.translationKeys.length === 1) {
      if (animation.translationKeys[0].timeAndFlags.time !== 0) {
        console.warn(`Translation key for model ${roi.name} has non-zero time of ${animation.translationKeys[0].timeAndFlags.time}`)
      }
      if (animation.translationKeys[0].timeAndFlags.flags !== 1) {
        console.warn(`Translation key for model ${roi.name} has non-standard flags of ${animation.translationKeys[0].timeAndFlags.flags}`)
      }
      roiModel.position.set(...animation.translationKeys[0].vertex)
    } else if (animation.translationKeys.length > 1) {
      console.warn(`Model ${roi.name} has ${animation.translationKeys.length} translation keys`)
    }
    if (animation.rotationKeys.length === 1) {
      if (animation.rotationKeys[0].timeAndFlags.time !== 0) {
        console.warn(`Rotation key for model ${roi.name} has non-zero time of ${animation.rotationKeys[0].timeAndFlags.time}`)
      }
      if (animation.rotationKeys[0].timeAndFlags.flags !== 1) {
        console.warn(`Rotation key for model ${roi.name} has non-standard flags of ${animation.rotationKeys[0].timeAndFlags.flags}`)
      }
      roiModel.quaternion.set(...animation.rotationKeys[0].quaternion)
    } else if (animation.rotationKeys.length > 1) {
      console.warn(`Model ${roi.name} has ${animation.rotationKeys.length} rotation keys`)
    }
    if (animation.scaleKeys.length === 1) {
      if (animation.scaleKeys[0].timeAndFlags.time !== 0) {
        console.warn(`Scale key for model ${roi.name} has non-zero time of ${animation.scaleKeys[0].timeAndFlags.time}`)
      }
      if (animation.scaleKeys[0].timeAndFlags.flags !== 1) {
        console.warn(`Scale key for model ${roi.name} has non-standard flags of ${animation.scaleKeys[0].timeAndFlags.flags}`)
      }
      roiModel.scale.set(...animation.scaleKeys[0].vertex)
    } else if (animation.scaleKeys.length > 1) {
      console.warn(`Model ${roi.name} has ${animation.scaleKeys.length} scale keys`)
    }
    if (animation.morphKeys.length > 0) {
      console.warn(`Model ${roi.name} has ${animation.morphKeys.length} morph keys`)
    }
  }

  const lods = (() => {
    switch (roi.data.type) {
      case 'lods':
        return roi.data.lods
      case 'reference':
        for (const part of parts) {
          if (part.name.toLowerCase() === roi.data.reference.toLowerCase()) {
            return part.lods
          }
        }
        console.warn(`${roi.name} wanted to reference ${roi.data.reference}`)
        return null
    }
  })()
  const lod = lods == null ? undefined : selectLod(lods)
  if (lod != null) {
    roiModel.offsetIndex = lod.meshesBeforeOffset.length
    const customColor: WDB.Color | null = colorFromName(roi.textureName)
    const meshes: THREE.Mesh[] = []
    let n = 0
    for (const [geometry, material] of createGeometryAndMaterials(lod, customColor, null, 'model')) {
      if (getSettings().graphics.realisticWater && material.name.toLowerCase() === 'ocean flat') {
        const mesh = createIslandWater(geometry)
        geometry.dispose()
        material.dispose()
        mesh.name = `${roiModel.name}-${++n}`.toLowerCase()
        roiModel.add(mesh)
        continue
      }

      let newMaterial: THREE.Material | null = null
      if (getSettings().graphics.pbrMaterials && (roi3d.name === 'rcgreen' || roi3d.name === 'rcblack') && material.name === 'lego black') {
        newMaterial = new THREE.MeshPhysicalMaterial({
          color: 0x1a1a1a,
          roughness: 0.7,
          metalness: 0.0,
          clearcoat: 0.1,
          clearcoatRoughness: 0.5,
        })
      }

      const mesh = new THREE.Mesh(geometry, newMaterial ?? material)
      mesh.name = `${roiModel.name}-${++n}`.toLowerCase()
      if (getSettings().graphics.shadows) {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
      roiModel.add(mesh)
      meshes.push(mesh)
    }
    if (lods != null) {
      trackLods(roiModel, lods, { meshes, lod, texture: null, customColor, type: 'model' })
    }
    roiModel.hasLod = lod != null
  }

  for (const child of roi.children) {
    const childRoi = await roiToMesh(
      child,
      parts,
      animation?.children.find(n => n.name.toLowerCase() === child.name.toLowerCase()),
      [...path, roi.name.toLowerCase()],
    )
    roi3d.addRoiChild(childRoi)
  }

  return roi3d
}

export type WdbWorldName = 'BLDD' | 'BLDH' | 'BLDJ' | 'BLDR' | 'HOSP' | 'POLICE' | 'GMAIN' | 'ICUBE' | 'IELEV' | 'IISLE' | 'IMAIN' | 'IREG' | 'RACC' | 'RACJ' | 'ACT1' | 'ACT2' | 'ACT3' | 'TEST' | 'TestWorld' | 'Isle'

export const getWorld = async (name: WdbWorldName): Promise<THREE.Group> => {
  const wdb = await getWdb()
  const world = wdb.worlds.find(w => w.name.toLowerCase() === name.toLowerCase())
  if (world == null) {
    throw new Error(`World ${name} not found`)
  }
  const group = new THREE.Group()
  group.name = `${name.toLowerCase()}_world`
  const island = islandModelName(
    world.models.map(model => model.roi.name),
    getSettings().islandQuality,
  )
  for (const model of world.models) {
    if (['isle', 'isle_lo', 'isle_hi'].includes(model.roi.name.toLowerCase()) && model.roi.name !== island) {
      continue
    }

    const matrix = calculateTransformationMatrix(model.position, model.rotation, model.up)

    const rootRoi = await roiToMesh(model.roi, world.parts, model.animation.tree)
    for (const roi of rootRoi.getAllModels()) {
      roi.applyMatrix4(matrix)
      roi.visible = model.roi.name === island || model.visible
    }
    group.add(...rootRoi.getAllModels())
  }
  for (const part of world.parts) {
    const mesh = await getWorldPart(world, part.name, null, null)
    mesh.name = part.name.toLowerCase()
    mesh.visible = false
    group.add(mesh.model)
  }
  return group
}

const getPart = async (name: string, part: WDB.Part, color: WDB.Color | null, texture: string | THREE.Texture | null): Promise<Roi3D> => {
  const lod = selectLod(part.lods)
  if (!lod) {
    throw new Error(`Couldn't find lod and children for part ${name}`)
  }
  const result = new Roi3D(new RoiModel(), name)
  const meshes: THREE.Mesh[] = []
  result.name = name.toLowerCase()
  result.model.name = name.toLowerCase()
  result.model.roi3d = result
  result.model.hasLod = true
  let n = 0
  for (const [geometry, material] of createGeometryAndMaterials(lod, color, texture, 'part')) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = `${name}-${++n}`.toLowerCase()
    if (getSettings().graphics.shadows) {
      mesh.castShadow = true
      mesh.receiveShadow = true
    }
    result.model.add(mesh)
    meshes.push(mesh)
  }
  result.model.boundingBox.makeEmpty()
  for (const mesh of meshes) {
    mesh.geometry.computeBoundingBox()
    if (mesh.geometry.boundingBox != null) {
      result.model.boundingBox.union(mesh.geometry.boundingBox)
    }
  }
  result.model.boundingBox.getBoundingSphere(result.model.boundingSphere)
  trackLods(result.model, part.lods, { meshes, lod, texture, customColor: color, type: 'part' })
  return result
}

export const getGlobalPart = async (name: string, color: WDB.Color | null, texture: string | THREE.Texture | null): Promise<Roi3D> => {
  const part = (await getWdb()).globalParts.find(p => p.name.toLowerCase() === name.toLowerCase())
  if (!part) {
    throw new Error(`Part ${name} not found`)
  }
  return await getPart(name, part, color, texture)
}

export const getWorldPart = async (world: WDB.World, name: string, color: WDB.Color | null, texture: string | THREE.Texture | null): Promise<Roi3D> => {
  const part = world.parts.find(p => p.name.toLowerCase() === name.toLowerCase())
  if (!part) {
    throw new Error(`Part ${name} not found`)
  }
  return await getPart(name, part, color, texture)
}
