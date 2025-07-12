import * as THREE from 'three'
import { engine } from '../engine'
import { getSettings } from '../settings'
import { getFileUrl, manager } from './load'
import { WDB } from './wdb'

export const textureLoader = new THREE.TextureLoader(manager)

export const colorAliases: Record<string, WDB.Color> = {
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

// spellchecker: disable
const variableTable: Record<string, string> = {
  c_dbbkfny0: 'lego red', // dunebuggy back fender
  c_dbbkxly0: 'lego white', // dunebuggy back axle
  c_chbasey0: 'lego black', // copter base
  c_chbacky0: 'lego black', // copter back
  c_chdishy0: 'lego white', // copter dish
  c_chhorny0: 'lego black', // copter horn
  c_chljety1: 'lego black', // copter left jet
  c_chrjety1: 'lego black', // copter right jet
  c_chmidly0: 'lego black', // copter middle
  c_chmotry0: 'lego blue', // copter motor
  c_chsidly0: 'lego black', // copter side left
  c_chsidry0: 'lego black', // copter side right
  c_chstuty0: 'lego black', // copter skids
  c_chtaily0: 'lego black', // copter tail
  c_chwindy1: 'lego black', // copter windshield
  c_dbfbrdy0: 'lego red', // dunebuggy body
  c_dbflagy0: 'lego yellow', // dunebuggy flag
  c_dbfrfny4: 'lego red', // dunebuggy front fender
  c_dbfrxly0: 'lego white', // dunebuggy front axle
  c_dbhndly0: 'lego white', // dunebuggy handlebar
  c_dbltbry0: 'lego white', // dunebuggy rear light
  c_jsdashy0: 'lego white', // jetski dash
  c_jsexhy0: 'lego black', // jetski exhaust
  c_jsfrnty5: 'lego black', // jetski front
  c_jshndly0: 'lego red', // jetski handlebar
  c_jslsidy0: 'lego black', // jetski left side
  c_jsrsidy0: 'lego black', // jetski right side
  c_jsskiby0: 'lego red', // jetski base
  c_jswnshy5: 'lego white', // jetski windshield
  c_rcbacky6: 'lego green', // racecar back
  c_rcedgey0: 'lego green', // racecar edge
  c_rcfrmey0: 'lego red', // racecar frame
  c_rcfrnty6: 'lego green', // racecar front
  c_rcmotry0: 'lego white', // racecar motor
  c_rcsidey0: 'lego green', // racecar side
  c_rcstery0: 'lego white', // racecar steering wheel
  c_rcstrpy0: 'lego yellow', // racecar stripe
  c_rctailya: 'lego white', // racecar tail
  c_rcwhl1y0: 'lego white', // racecar wheels 1
  c_rcwhl2y0: 'lego white', // racecar wheels 2
  c_jsbasey0: 'lego white', // jetski base
  c_chblady0: 'lego black', // copter blades
  c_chseaty0: 'lego white', // copter seat
}
// spellchecker: enable

export const colorFromName = (name: string): WDB.Color | null => {
  if (name.length > 0 && (name.toLowerCase().startsWith('indir-f-') || name.toLowerCase().startsWith('indir-g-'))) {
    const variableName = `c_${name.substring('indir-f-'.length)}`.toLowerCase()
    const variableValue = variableTable[variableName].toLowerCase()
    if (variableValue != null) {
      const aliasedColor = colorAliases[variableValue]
      if (aliasedColor != null) {
        return aliasedColor
      }
    }
  }
  return null
}

const createTexture = (name: string, source: 'model' | 'part' | 'image'): THREE.Texture => {
  const sourceToPath = {
    model: 'model_textures',
    part: 'part_textures',
    image: 'images',
  }
  return textureLoader.load(getFileUrl(`world/${sourceToPath[source]}/${name.toLowerCase()}.png`), texture => {
    if (getSettings().graphics.toneMapping === 'none') {
      texture.colorSpace = THREE.SRGBColorSpace
    }
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    if (getSettings().graphics.toneMapping === 'filmic') {
      texture.anisotropy = engine.renderer.capabilities.getMaxAnisotropy()
    }
  })
}

const createGeometryAndMaterial = (modelMesh: WDB.Mesh, customColor: WDB.Color | null, texture: string | THREE.Texture | null, type: 'model' | 'part'): [THREE.BufferGeometry, THREE.Material] => {
  const vertices: number[] = modelMesh.vertices.flat()
  const indices: number[] = modelMesh.indices
  const uvs: number[] = modelMesh.uvs.flat()
  const material = (() => {
    if (getSettings().graphics.pbrMaterials && modelMesh.shading !== WDB.Shading.WireFrame) {
      const material = new THREE.MeshPhysicalMaterial({ flatShading: modelMesh.shading === WDB.Shading.Flat, metalness: 0, roughness: 1 })

      if (['grass', 'rock', 'sand', 'ocean', 'cave', 'beach', 'mites', 'pebble'].every(m => !modelMesh.materialName.toLowerCase().includes(m))) {
        material.roughness = modelMesh.materialName.toLowerCase().includes('windo blue') ? 0 : 0.1
        material.metalness = modelMesh.materialName.toLowerCase().includes('windo blue') ? 0.4 : 0
        material.clearcoat = 0.7
        material.clearcoatRoughness = modelMesh.materialName.toLowerCase().includes('windo blue') ? 0 : 0.1
        material.specularIntensity = 0.4
        material.iridescence = 1
        material.reflectivity = modelMesh.materialName.toLowerCase().includes('windo blue') ? 1 : 0.5
      }

      const loadTexture = (name: string) => {
        return textureLoader.load(`hd/textures/${name}.png`, texture => {
          if (name.includes('normal')) {
            texture.colorSpace = THREE.LinearSRGBColorSpace
          } else {
            texture.colorSpace = THREE.SRGBColorSpace
          }
          texture.wrapS = THREE.RepeatWrapping
          texture.wrapT = THREE.RepeatWrapping
          texture.repeat.set(1, 1)
        })
      }

      if (new URLSearchParams(window.location.search).get('hd') === 'true' && import.meta.env.VITE_HD_ASSETS_AVAILABLE === 'true') {
        if (modelMesh.materialName.toLowerCase().includes('grass')) {
          const material = new THREE.MeshPhysicalMaterial({
            flatShading: modelMesh.shading === WDB.Shading.Flat,
            metalness: 0,
            map: loadTexture('leafy-grass2-albedo'),
            roughnessMap: loadTexture('leafy-grass2-roughness'),
            aoMap: loadTexture('leafy-grass2-ao'),
            normalMap: loadTexture('leafy-grass2-normal-ogl'),
          })
          material.normalScale.set(10, 10)
          return material
        }

        if (modelMesh.materialName.toLowerCase().includes('pebble')) {
          const material = new THREE.MeshPhysicalMaterial({
            flatShading: modelMesh.shading === WDB.Shading.Flat,
            metalness: 0,
            map: loadTexture('rocky-dunes1_albedo'),
            roughnessMap: loadTexture('ocean-rock_roughness'),
            aoMap: loadTexture('rocky-dunes1_ao'),
            normalMap: loadTexture('rocky-dunes1_normal-ogl'),
          })
          material.normalScale.set(5, 5)
          return material
        }

        if (modelMesh.materialName.toLowerCase().includes('rock')) {
          const material = new THREE.MeshPhysicalMaterial({
            flatShading: modelMesh.shading === WDB.Shading.Flat,
            metalness: 0,
            map: loadTexture('black-streaked-rock1-albedo'),
            roughnessMap: loadTexture('black-streaked-rock1-Roughness'),
            aoMap: loadTexture('black-streaked-rock1-ao'),
            normalMap: loadTexture('black-streaked-rock1-Normal-ogl'),
          })
          material.normalScale.set(1, 1)
          return material
        }

        if (modelMesh.materialName.toLowerCase().includes('sand')) {
          const material = new THREE.MeshPhysicalMaterial({
            flatShading: modelMesh.shading === WDB.Shading.Flat,
            metalness: 0,
            roughness: 1,
            map: loadTexture('wavy-sand_albedo'),
            aoMap: loadTexture('wavy-sand_ao'),
            normalMap: loadTexture('wavy-sand_normal-ogl'),
          })
          material.normalScale.set(10, 10)
          return material
        }
      }

      return material
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
    const color = customColor ?? colorFromName(modelMesh.materialName) ?? modelMesh.color ?? modelMesh.color
    material.color = new THREE.Color(color.red / 255, color.green / 255, color.blue / 255)
    if (color.alpha < 0.99) {
      material.transparent = true
      material.opacity = color.alpha
    }
  }
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
