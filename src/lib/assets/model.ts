import * as THREE from 'three'
import { Water } from 'three/addons/objects/Water.js'
import { Isle } from '../../worlds/isle'
import type { ModelAction } from '../action-types'
import { engine } from '../engine'
import { getSettings } from '../settings'
import type { Actor } from '../world/actor'
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

export class BoundingBox extends THREE.Box3 {
  public static fromSphere(sphere: BoundingSphere): BoundingBox {
    const min = sphere.center.clone().subScalar(sphere.radius)
    const max = sphere.center.clone().addScalar(sphere.radius)
    return new BoundingBox(min, max)
  }
}

export class RoiModel extends THREE.Group {
  private _roi3d: Roi3D | null = null
  public offsetIndex = 0
  public boundingSphere = new BoundingSphere(0, new THREE.Vector3(0, 0, 0))
  public boundingBox: BoundingBox | null = null

  public set roi3d(value: Roi3D) {
    this._roi3d = value
  }

  public get roi3d(): Roi3D {
    if (this._roi3d == null) {
      throw new Error(`Roi3d for ${this.name} is not set`)
    }
    return this._roi3d
  }

  public getWorldBoundingSphere(): BoundingSphere {
    const worldCenter = this.getWorldPosition(new THREE.Vector3())
    worldCenter.add(this.boundingSphere.center)
    return new BoundingSphere(this.boundingSphere.radius, worldCenter)
  }

  public getWorldBoundingBox(): THREE.Box3 | null {
    if (this.boundingBox == null) {
      return BoundingBox.fromSphere(this.getWorldBoundingSphere())
    }
    const worldPosition = this.getWorldPosition(new THREE.Vector3())
    const min = this.boundingBox.min.clone().add(worldPosition)
    const max = this.boundingBox.max.clone().add(worldPosition)
    return new BoundingBox(min, max)
  }

  public override copy(object: THREE.Object3D, recursive?: boolean): this {
    super.copy(object, recursive)
    if (object instanceof RoiModel) {
      this.offsetIndex = object.offsetIndex
      this.boundingSphere = object.boundingSphere
      this.boundingBox = object.boundingBox
      this._roi3d = null
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
    public readonly name: string,
  ) {}

  public addRoiChild(child: Roi3D): void {
    child.parent = this
    this.children.push(child)
  }

  public getAllModels(): RoiModel[] {
    return [this.model, ...this.children.flatMap(c => c.getAllModels())]
  }

  public set visible(value: boolean) {
    this.model.visible = value
    for (const roi of this.children) {
      roi.visible = value
    }
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
  roiModel.boundingSphere = new BoundingSphere(roi.boundingSphere.radius, new THREE.Vector3(...roi.boundingSphere.center))
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
  const lod = lods?.at(-1)
  if (lod != null) {
    roiModel.offsetIndex = lod.meshesBeforeOffset.length
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
        mesh.name = `${roiModel.name}-${++n}`.toLowerCase()
        roiModel.add(mesh)
        if (engine.currentWorld instanceof Isle) {
          engine.currentWorld.water = mesh
        }
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
    createdMeshes.push({ meshes, lod, texture: null, customColor })
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
  for (const model of world.models) {
    if (model.roi.name.toLowerCase() === 'isle' || model.roi.name.toLowerCase() === 'isle_lo') {
      continue
    }

    const matrix = calculateTransformationMatrix(model.position, model.rotation, model.up)

    const rootRoi = await roiToMesh(model.roi, world.parts, model.animation.tree)
    for (const roi of rootRoi.getAllModels()) {
      roi.applyMatrix4(matrix)
      roi.visible = model.visible
    }
    group.add(...rootRoi.getAllModels())
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
