import * as THREE from 'three'
import { Water } from 'three/addons/objects/Water.js'
import { Isle } from '../../worlds/isle'
import { engine } from '../engine'
import { getSettings } from '../settings'
import { getFile, getFileUrl } from './load'
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

export const calculateTransformationMatrix = (location: [number, number, number], direction: [number, number, number], up: [number, number, number], matrix?: THREE.Matrix4): THREE.Matrix4 => {
  const locationVector = new THREE.Vector3(...location)
  const directionVector = new THREE.Vector3(...direction).normalize()
  const upVector = new THREE.Vector3(...up).normalize()

  const right = new THREE.Vector3().crossVectors(upVector, directionVector).normalize()
  const newUp = new THREE.Vector3().crossVectors(directionVector, right).normalize()

  const transformationMatrix = matrix ?? new THREE.Matrix4()
  transformationMatrix.makeBasis(right, newUp, directionVector)
  transformationMatrix.setPosition(locationVector)
  return transformationMatrix
}

const roiToMesh = async (roi: WDB.Roi, parts: WDB.Part[], animation: WDB.Animation.Node | undefined, path: string[] = []): Promise<THREE.Mesh> => {
  const result = new THREE.Mesh()
  result.name = roi.name.toLowerCase()

  if (path.length < 1) {
    path.push(roi.name)
  }

  if (animation) {
    if (animation.translationKeys.length === 1) {
      if (animation.translationKeys[0].timeAndFlags.time !== 0) {
        console.warn(`Translation key for model ${roi.name} has non-zero time of ${animation.translationKeys[0].timeAndFlags.time}`)
      }
      if (animation.translationKeys[0].timeAndFlags.flags !== 1) {
        console.warn(`Translation key for model ${roi.name} has non-standard flags of ${animation.translationKeys[0].timeAndFlags.flags}`)
      }
      result.position.set(...animation.translationKeys[0].vertex)
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
      result.quaternion.set(...animation.rotationKeys[0].quaternion)
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
      result.scale.set(...animation.scaleKeys[0].vertex)
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
    const customColor: WDB.Color | null = colorFromName(roi.textureName)
    const meshes: THREE.Mesh[] = []
    let n = 0
    for (const [geometry, material] of createGeometryAndMaterials(lod, customColor, null, 'model')) {
      if (getSettings().graphics.realisticWater && import.meta.env.VITE_HD_ASSETS_AVAILABLE === 'true' && material.name.toLowerCase() === 'ocean flat') {
        const mesh = new Water(geometry, {
          textureWidth: 512,
          textureHeight: 512,
          waterNormals: new THREE.TextureLoader().load('hd/textures/waternormals.jpg', texture => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping
          }),
          distortionScale: 5,
        })
        mesh.material.uniforms.size.value = 7
        mesh.name = `${path.join('-')}-${++n}`.toLowerCase()
        result.add(mesh)
        if (engine.currentWorld instanceof Isle) {
          engine.currentWorld.water = mesh
        }
        continue
      }

      const mesh = new THREE.Mesh(geometry, material)
      mesh.name = `${path.join('-')}-${++n}`.toLowerCase()
      if (getSettings().graphics.shadows) {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
      result.add(mesh)
      meshes.push(mesh)
    }
    createdMeshes.push({ meshes, lod, texture: null, customColor })
  }
  for (const child of roi.children) {
    result.add(
      await roiToMesh(
        child,
        parts,
        animation?.children.find(n => n.name.toLowerCase() === child.name.toLowerCase()),
        [...path, child.name],
      ),
    )
  }
  return result
}

export const getWorld = async (name: 'BLDD' | 'BLDH' | 'BLDJ' | 'BLDR' | 'HOSP' | 'POLICE' | 'GMAIN' | 'ICUBE' | 'IELEV' | 'IISLE' | 'IMAIN' | 'IREG' | 'RACC' | 'RACJ' | 'ACT1' | 'ACT2' | 'ACT3' | 'TEST' | 'TestWorld' | 'Isle'): Promise<THREE.Group> => {
  const wdb = await getWdb()
  const world = wdb.worlds.find(w => w.name.toLowerCase() === name.toLowerCase())
  if (world == null) {
    throw new Error(`World ${name} not found`)
  }
  const group = new THREE.Group()
  group.name = name.toLowerCase()
  for (const model of world.models) {
    if (model.roi.name.toLowerCase() === 'isle' || model.roi.name.toLowerCase() === 'isle_lo') {
      continue
    }

    const mesh = await roiToMesh(model.roi, world.parts, model.animation.tree)
    const matrix = calculateTransformationMatrix(model.position, model.rotation, model.up)
    matrix.decompose(mesh.position, mesh.quaternion, mesh.scale)
    mesh.visible = model.visible
    group.add(mesh)
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
