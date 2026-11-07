import { type ColorName, isColorTableName } from '../color-table.ts'

export { type ColorName, ColorNames, type ColorTableName, ColorTableNames, getDefaultColor, isColorName, isColorTableName } from '../color-table.ts'

import * as THREE from 'three'
import { engine } from '../engine'
import { getSurfaceProperties } from '../graphics.ts'
import { VehicleTextureSlots } from '../save-game'
import { getSettings } from '../settings'
import { getFileUrl, manager } from './load'
import { RoiModel } from './model'
import { WDB } from './wdb'

export const textureLoader = new THREE.TextureLoader(manager)

export const colorAliases: Record<ColorName, WDB.Color> = {
  'lego black': { red: 0x21, green: 0x21, blue: 0x21, alpha: 1 },
  'lego black f': { red: 0x21, green: 0x21, blue: 0x21, alpha: 1 },
  'lego black flat': { red: 0x21, green: 0x21, blue: 0x21, alpha: 1 },
  'lego blue': { red: 0x00, green: 0x54, blue: 0x8c, alpha: 1 },
  'lego blue flat': { red: 0x00, green: 0x54, blue: 0x8c, alpha: 1 },
  'lego brown': { red: 0x4a, green: 0x23, blue: 0x1a, alpha: 1 },
  'lego brown flt': { red: 0x4a, green: 0x23, blue: 0x1a, alpha: 1 },
  'lego brown flat': { red: 0x4a, green: 0x23, blue: 0x1a, alpha: 1 },
  'lego drk grey': { red: 0x40, green: 0x40, blue: 0x40, alpha: 1 },
  'lego drk grey flt': { red: 0x40, green: 0x40, blue: 0x40, alpha: 1 },
  'lego dk grey flt': { red: 0x40, green: 0x40, blue: 0x40, alpha: 1 },
  'lego green': { red: 0x00, green: 0x78, blue: 0x2d, alpha: 1 },
  'lego green flat': { red: 0x00, green: 0x78, blue: 0x2d, alpha: 1 },
  'lego lt grey': { red: 0x82, green: 0x82, blue: 0x82, alpha: 1 },
  'lego lt grey flt': { red: 0x82, green: 0x82, blue: 0x82, alpha: 1 },
  'lego lt grey fla': { red: 0x82, green: 0x82, blue: 0x82, alpha: 1 },
  'lego red': { red: 0xcb, green: 0x12, blue: 0x20, alpha: 1 },
  'lego red flat': { red: 0xcb, green: 0x12, blue: 0x20, alpha: 1 },
  'lego white': { red: 0xfa, green: 0xfa, blue: 0xfa, alpha: 1 },
  'lego white flat': { red: 0xfa, green: 0xfa, blue: 0xfa, alpha: 1 },
  'lego yellow': { red: 0xff, green: 0xb9, blue: 0x00, alpha: 1 },
  'lego yellow flat': { red: 0xff, green: 0xb9, blue: 0x00, alpha: 1 },
}

export const colorFromName = (name: string): WDB.Color | null => {
  if (name.length > 0 && (name.toLowerCase().startsWith('indir-f-') || name.toLowerCase().startsWith('indir-g-'))) {
    const colorTableName = `c_${name.substring('indir-f-'.length)}`.toLowerCase()

    if (!isColorTableName(colorTableName)) {
      console.warn(`Variable ${colorTableName} not found in variable table`)
      return null
    }

    const colorTableValue = engine.currentSaveGame.getColor(colorTableName)
    const aliasedColor = colorAliases[colorTableValue]
    if (aliasedColor != null) {
      return aliasedColor
    }
  }
  return null
}

export const toThreeColor = (color: WDB.Color): THREE.Color => new THREE.Color(color.red / 255, color.green / 255, color.blue / 255).convertSRGBToLinear()

export const colorMesh = (object: THREE.Object3D, color: THREE.Color): void =>
  RoiModel.traverseWithOffset(object, object => {
    if (object instanceof THREE.Mesh) {
      object.material.color = color
    }
  })

const textures = new Map<string, THREE.Texture>()
const namedTextureMaterials = new Map<string, Set<THREE.MeshBasicMaterial | THREE.MeshLambertMaterial | THREE.MeshPhysicalMaterial>>()
const textureKey = (name: string): string => name.toLowerCase().replace(/\.[^.]+$/, '')

export const replaceNamedTexture = (name: string, texture: THREE.Texture): void => {
  for (const material of namedTextureMaterials.get(textureKey(name)) ?? []) {
    material.map = texture
    material.needsUpdate = true
  }
}

const createTexture = (name: string, source: 'model' | 'part' | 'image'): THREE.Texture => {
  const sourceToPath = {
    model: 'model_textures',
    part: 'part_textures',
    image: 'images',
  }
  const slot = VehicleTextureSlots.find(slot => slot === textureKey(name))
  const override = slot == null ? null : engine.currentSaveGame.getVehicleTexture(slot)
  const path = override != null && /^(copter|dunecar|jetski|racecar)\/\d+$/.test(override) ? `${override}.png` : `world/${sourceToPath[source]}/${name.toLowerCase()}.png`
  const url = getFileUrl(path)
  const cached = textures.get(url)
  if (cached != null) {
    return cached
  }
  const loaded = textureLoader.load(url, texture => {
    texture.name = name.toLowerCase()
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    if (getSettings().graphics.textureFiltering) {
      texture.magFilter = THREE.LinearFilter
      texture.minFilter = THREE.LinearMipmapLinearFilter
      texture.anisotropy = Math.min(8, engine.renderer.capabilities.getMaxAnisotropy())
    }
  })
  loaded.name = name.toLowerCase()
  textures.set(url, loaded)
  return loaded
}

const createGeometryAndMaterial = (modelMesh: WDB.Mesh, customColor: WDB.Color | null, texture: string | THREE.Texture | null, type: 'model' | 'part'): [THREE.BufferGeometry, THREE.Material] => {
  const vertices: number[] = modelMesh.vertices.flat()
  const indices: number[] = modelMesh.indices
  const uvs: number[] = modelMesh.uvs.flat()
  const material = (() => {
    if (getSettings().graphics.pbrMaterials && modelMesh.shading !== WDB.Shading.WireFrame) {
      return new THREE.MeshPhysicalMaterial({ flatShading: modelMesh.shading === WDB.Shading.Flat, ...getSurfaceProperties(modelMesh.materialName) })
    }

    switch (modelMesh.shading) {
      case WDB.Shading.WireFrame:
        return new THREE.MeshBasicMaterial({ wireframe: true })
      case WDB.Shading.Gouraud:
        return new THREE.MeshLambertMaterial()
      case WDB.Shading.Flat:
        return new THREE.MeshLambertMaterial({ flatShading: true })
      default:
        throw new Error(`Unknown shading: ${modelMesh.shading}`)
    }
  })()
  const geometry = new THREE.BufferGeometry()
  geometry.setIndex(indices)
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(modelMesh.normals.flat()), 3))

  if (modelMesh.textureName) {
    if (material.map == null) {
      if (texture instanceof THREE.Texture) {
        material.map = texture
      } else {
        material.map = createTexture(texture ?? modelMesh.textureName, texture ? 'image' : type)
      }
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
    geometry.setAttribute('uv2', new THREE.BufferAttribute(new Float32Array(uvs), 2))
  } else {
    const color = customColor ?? colorFromName(modelMesh.materialName) ?? modelMesh.color
    material.color = toThreeColor(color)
    if (color.alpha < 0.99) {
      material.transparent = true
      material.opacity = color.alpha
    }
  }
  if (modelMesh.textureName) {
    const key = textureKey(modelMesh.textureName)
    const materials = namedTextureMaterials.get(key) ?? new Set()
    materials.add(material)
    namedTextureMaterials.set(key, materials)
  }
  geometry.computeBoundingBox()
  return [geometry, material]
}

export const createGeometryAndMaterials = (lod: WDB.Lod, customColor: WDB.Color | null, texture: string | THREE.Texture | null, type: 'model' | 'part'): [THREE.BufferGeometry, THREE.Material][] => {
  const result: [THREE.BufferGeometry, THREE.Material][] = []
  for (const modelMesh of lod.meshesBeforeOffset) {
    const [geometry, material] = createGeometryAndMaterial(modelMesh, null, null, type)
    material.name = modelMesh.materialName.toLowerCase()
    result.push([geometry, material])
  }
  for (const modelMesh of lod.meshesAfterOffset) {
    const [geometry, material] = createGeometryAndMaterial(modelMesh, customColor, texture, type)
    material.name = modelMesh.materialName.toLowerCase()
    result.push([geometry, material])
  }
  return result
}
