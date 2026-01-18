import * as THREE from 'three'
import { Water } from 'three/addons/objects/Water.js'
import { Isle } from '../../worlds/isle'
import type { ModelAction } from '../action-types'
import { engine } from '../engine'
import { getSettings } from '../settings'
import { BinaryReader } from './binary-reader'
import { getAction, getFile, getFileUrl } from './load'
import { colorFromName, createGeometryAndMaterials } from './mesh'
import { WDB } from './wdb'

let wdb: WDB.File | null = null

const createdMeshes: {
  meshes: THREE.Mesh[]
  lod: WDB.Lod
  texture: string | THREE.Texture | null
  customColor: WDB.Color | null
}[] = []

if (import.meta.hot) {
  import.meta.hot.accept('./mesh', newModule => {
    if (newModule == null) {
      return
    }

    for (const { meshes, lod, texture, customColor } of createdMeshes) {
      const geometryAndMaterials = newModule.createGeometryAndMaterials(lod, customColor, texture, 'model')
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

export class BoundingSphere {
  public constructor(
    public readonly radius: number,
    public readonly center: THREE.Vector3,
  ) {}

  public intersect(other: BoundingSphere): boolean {
    const distanceSquared = other.center.distanceToSquared(this.center)
    return distanceSquared < this.radius * this.radius
  }
}

export class Roi3D extends THREE.Group {
  public boundingSphere = new BoundingSphere(0, new THREE.Vector3(0, 0, 0))
  public offsetIndex = 0
  public ownName = ''
  public roiChildren: Roi3D[] = []
  public roiParent: Roi3D | null = null

  public getWorldBoundingSphere(): BoundingSphere {
    const worldCenter = this.getWorldPosition(new THREE.Vector3())
    worldCenter.add(this.boundingSphere.center)
    return new BoundingSphere(this.boundingSphere.radius, worldCenter)
  }

  public override copy(object: THREE.Object3D, recursive?: boolean): this {
    super.copy(object, recursive)
    if (object instanceof Roi3D) {
      this.boundingSphere = object.boundingSphere
      this.offsetIndex = object.offsetIndex
      this.ownName = object.ownName
      this.roiChildren = recursive ? object.roiChildren.map(c => c.clone(true)) : []
    }
    return this
  }

  public addRoiChild(child: Roi3D): void {
    child.roiParent = this
    this.roiChildren.push(child)
  }

  public removeRoiChild(child: Roi3D): boolean {
    const index = this.roiChildren.indexOf(child)
    if (index === -1) {
      return false
    }
    child.roiParent = null
    this.roiChildren.splice(index, 1)
    return true
  }

  public getAllRoiDescendants(): Roi3D[] {
    const result: Roi3D[] = []
    for (const child of this.roiChildren) {
      result.push(child)
      result.push(...child.getAllRoiDescendants())
    }
    return result
  }

  public getAllRois(): Roi3D[] {
    return [this, ...this.getAllRoiDescendants()]
  }

  public traverseRoi(callback: (roi: Roi3D) => void): void {
    callback(this)
    for (const child of this.roiChildren) {
      child.traverseRoi(callback)
    }
  }

  public findRoi(predicate: (roi: Roi3D) => boolean): Roi3D | null {
    if (predicate(this)) {
      return this
    }
    for (const child of this.roiChildren) {
      const found = child.findRoi(predicate)
      if (found) {
        return found
      }
    }
    return null
  }

  public findRoiByName(name: string): Roi3D | null {
    return this.findRoi(roi => roi.ownName === name.toLowerCase())
  }

  public findAllRois(predicate: (roi: Roi3D) => boolean): Roi3D[] {
    const result: Roi3D[] = []
    this.traverseRoi(roi => {
      if (predicate(roi)) {
        result.push(roi)
      }
    })
    return result
  }

  public setRoiVisibility(visibility: 'visible' | 'invisible'): void {
    const isVisible = visibility === 'visible'
    for (const roi of this.getAllRois()) {
      roi.visible = isVisible
      for (const child of roi.children) {
        child.visible = isVisible
      }
    }
  }

  public moveRoiTo(targetPosition: THREE.Vector3, targetQuaternion?: THREE.Quaternion): void {
    const objects = this.getAllRois()
    for (const object of objects) {
      object.updateMatrixWorld(true)
    }

    const baseWorldPosition = new THREE.Vector3()
    const baseWorldQuaternion = new THREE.Quaternion()
    this.getWorldPosition(baseWorldPosition)
    this.getWorldQuaternion(baseWorldQuaternion)

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

  public getRoiRoot(): Roi3D {
    let current: Roi3D = this
    while (current.roiParent) {
      current = current.roiParent
    }
    return current
  }

  public static traverseWithOffset(object: THREE.Object3D, callback: (object: THREE.Object3D) => void): void {
    callback(object)
    const children = object instanceof Roi3D ? object.children.slice(object.offsetIndex) : object.children
    for (const child of children) {
      Roi3D.traverseWithOffset(child, callback)
    }
  }

  public traverseWithOffset(callback: (object: THREE.Object3D) => void): void {
    Roi3D.traverseWithOffset(this, callback)
  }
}

const roiToMesh = async (roi: WDB.Roi, parts: WDB.Part[], animation: WDB.Animation.Node | undefined, path: string[] = []): Promise<Roi3D> => {
  const roiNode = new Roi3D()
  roiNode.boundingSphere = new BoundingSphere(roi.boundingSphere.radius, new THREE.Vector3(...roi.boundingSphere.center))
  roiNode.ownName = roi.name.toLowerCase()
  roiNode.name = [...path, roiNode.ownName].join('_')

  if (animation) {
    if (animation.translationKeys.length === 1) {
      if (animation.translationKeys[0].timeAndFlags.time !== 0) {
        console.warn(`Translation key for model ${roi.name} has non-zero time of ${animation.translationKeys[0].timeAndFlags.time}`)
      }
      if (animation.translationKeys[0].timeAndFlags.flags !== 1) {
        console.warn(`Translation key for model ${roi.name} has non-standard flags of ${animation.translationKeys[0].timeAndFlags.flags}`)
      }
      roiNode.position.set(...animation.translationKeys[0].vertex)
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
      roiNode.quaternion.set(...animation.rotationKeys[0].quaternion)
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
      roiNode.scale.set(...animation.scaleKeys[0].vertex)
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
  const lod = lods?.at(-1)
  if (lod != null) {
    roiNode.offsetIndex = lod.meshesBeforeOffset.length
    const customColor: WDB.Color | null = colorFromName(roi.textureName)
    const meshes: THREE.Mesh[] = []
    let n = 0
    for (const [geometry, material] of createGeometryAndMaterials(lod, customColor, null, 'model')) {
      if (getSettings().graphics.realisticWater && material.name.toLowerCase() === 'ocean flat') {
        const mesh = new Water(geometry, {
          textureWidth: 512,
          textureHeight: 512,
          waterNormals: new THREE.TextureLoader().load('hd/textures/waternormals.jpg', texture => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping
          }),
          distortionScale: 5,
        })
        mesh.material.uniforms.size.value = 7
        mesh.name = `${roiNode.name}-${++n}`.toLowerCase()
        roiNode.add(mesh)
        if (engine.currentWorld instanceof Isle) {
          engine.currentWorld.water = mesh
        }
        continue
      }

      let newMaterial: THREE.Material | null = null
      if (getSettings().graphics.pbrMaterials && (roiNode.name === 'rcgreen' || roiNode.name === 'rcblack') && material.name === 'lego black') {
        newMaterial = new THREE.MeshPhysicalMaterial({
          color: 0x1a1a1a,
          roughness: 0.7,
          metalness: 0.0,
          clearcoat: 0.1,
          clearcoatRoughness: 0.5,
        })
      }

      const mesh = new THREE.Mesh(geometry, newMaterial ?? material)
      mesh.name = `${roiNode.name}-${++n}`.toLowerCase()
      if (getSettings().graphics.shadows) {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
      roiNode.add(mesh)
      meshes.push(mesh)
    }
    createdMeshes.push({ meshes, lod, texture: null, customColor })
  }

  for (const child of roi.children) {
    const childRoi = await roiToMesh(
      child,
      parts,
      animation?.children.find(n => n.name.toLowerCase() === child.name.toLowerCase()),
      [...path, roi.name.toLowerCase()],
    )
    roiNode.addRoiChild(childRoi)
  }

  return roiNode
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
  for (const model of world.models) {
    if (model.roi.name.toLowerCase() === 'isle' || model.roi.name.toLowerCase() === 'isle_lo') {
      continue
    }

    const matrix = calculateTransformationMatrix(model.position, model.rotation, model.up)

    const rootRoi = await roiToMesh(model.roi, world.parts, model.animation.tree)
    for (const roi of rootRoi.getAllRois()) {
      roi.applyMatrix4(matrix)
      roi.visible = model.visible
    }
    group.add(...rootRoi.getAllRois())
  }
  for (const part of world.parts) {
    const mesh = await getWorldPart(world, part.name, null, null)
    mesh.name = part.name.toLowerCase()
    mesh.visible = false
    group.add(mesh)
  }
  return group
}

const getPart = async (name: string, part: WDB.Part, color: WDB.Color | null, texture: string | THREE.Texture | null): Promise<THREE.Group> => {
  const lod = part.lods.at(-1)
  if (!lod) {
    throw new Error(`Couldn't find lod and children for part ${name}`)
  }
  const result = new THREE.Group()
  const meshes: THREE.Mesh[] = []
  result.name = name.toLowerCase()
  let n = 0
  for (const [geometry, material] of createGeometryAndMaterials(lod, color, texture, 'part')) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = `${name}-${++n}`.toLowerCase()
    if (getSettings().graphics.shadows) {
      mesh.castShadow = true
      mesh.receiveShadow = true
    }
    result.add(mesh)
    meshes.push(mesh)
  }
  createdMeshes.push({ meshes, lod, texture, customColor: color })
  return result
}

export const getGlobalPart = async (name: string, color: WDB.Color | null, texture: string | THREE.Texture | null): Promise<THREE.Group> => {
  const part = (await getWdb()).globalParts.find(p => p.name.toLowerCase() === name.toLowerCase())
  if (!part) {
    throw new Error(`Part ${name} not found`)
  }
  return await getPart(name, part, color, texture)
}

export const getWorldPart = async (world: WDB.World, name: string, color: WDB.Color | null, texture: string | THREE.Texture | null): Promise<THREE.Group> => {
  const part = world.parts.find(p => p.name.toLowerCase() === name.toLowerCase())
  if (!part) {
    throw new Error(`Part ${name} not found`)
  }
  return await getPart(name, part, color, texture)
}
