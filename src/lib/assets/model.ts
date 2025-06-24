import * as THREE from 'three'
import { getFile, getFileUrl, manager } from './load'
import { WDB } from './wdb'

const textureLoader = new THREE.TextureLoader(manager)

let wdb: WDB.File | null = null

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

const colorFromName = (name: string): WDB.Color | null => {
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

const createTexture = async (name: string, source: 'model' | 'part' | 'image'): Promise<THREE.Texture> => {
  const sourceToPath = {
    model: 'model_textures',
    part: 'part_textures',
    image: 'images',
  }
  const texture = await textureLoader.loadAsync(getFileUrl(`world/${sourceToPath[source]}/${name}.png`))
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  return texture
}

const createMesh = (modelMesh: WDB.Mesh, customColor: WDB.Color | null, texture: string | THREE.Texture | null, type: 'model' | 'part'): [THREE.BufferGeometry, THREE.Material] => {
  const vertices: number[] = modelMesh.vertices.flat()
  const indices: number[] = modelMesh.indices
  const uvs: number[] = modelMesh.uvs.flat()
  const material = (() => {
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
    if (texture instanceof THREE.Texture) {
      material.map = texture
    } else {
      void createTexture(texture ?? modelMesh.textureName, texture ? 'image' : type).then(texture => {
        material.map = texture
        material.needsUpdate = true
      })
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
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

const createMeshValues = (lod: WDB.Lod, customColor: WDB.Color | null, texture: string | THREE.Texture | null, type: 'model' | 'part'): [THREE.BufferGeometry, THREE.Material][] => {
  const result: [THREE.BufferGeometry, THREE.Material][] = []
  for (const modelMesh of lod.meshesBeforeOffset) {
    const [geometry, material] = createMesh(modelMesh, null, null, type)
    result.push([geometry, material])
  }
  for (const modelMesh of lod.meshesAfterOffset) {
    const [geometry, material] = createMesh(modelMesh, customColor, texture, type)
    result.push([geometry, material])
  }
  return result
}

const roiToMesh = async (roi: WDB.Roi, animation: WDB.Animation.Node | undefined): Promise<THREE.Mesh> => {
  const result = new THREE.Mesh()
  result.name = roi.name

  if (animation) {
    if (animation.translationKeys.length === 1) {
      if (animation.translationKeys[0].timeAndFlags.time !== 0) {
        console.log(`Translation key for model ${roi.name} has non-zero time of ${animation.translationKeys[0].timeAndFlags.time}`)
      }
      if (animation.translationKeys[0].timeAndFlags.flags !== 1) {
        console.log(`Translation key for model ${roi.name} has non-standard flags of ${animation.translationKeys[0].timeAndFlags.flags}`)
      }
      result.position.set(...animation.translationKeys[0].vertex)
    } else if (animation.translationKeys.length > 1) {
      console.log(`Model ${roi.name} has ${animation.translationKeys.length} translation keys`)
    }
    if (animation.rotationKeys.length === 1) {
      if (animation.rotationKeys[0].timeAndFlags.time !== 0) {
        console.log(`Rotation key for model ${roi.name} has non-zero time of ${animation.rotationKeys[0].timeAndFlags.time}`)
      }
      if (animation.rotationKeys[0].timeAndFlags.flags !== 1) {
        console.log(`Rotation key for model ${roi.name} has non-standard flags of ${animation.rotationKeys[0].timeAndFlags.flags}`)
      }
      result.quaternion.set(...animation.rotationKeys[0].quaternion)
    } else if (animation.rotationKeys.length > 1) {
      console.log(`Model ${roi.name} has ${animation.rotationKeys.length} rotation keys`)
    }
    if (animation.scaleKeys.length > 0) {
      console.log(`Model ${roi.name} has ${animation.scaleKeys.length} scale keys`)
    }
    if (animation.morphKeys.length > 0) {
      console.log(`Model ${roi.name} has ${animation.morphKeys.length} morph keys`)
    }
  }

  const lod = roi.lods.at(-1)
  if (lod != null) {
    const customColor: WDB.Color | null = colorFromName(roi.textureName)
    for (const [geometry, material] of createMeshValues(lod, customColor, null, 'model')) {
      result.add(new THREE.Mesh(geometry, material))
    }
  }
  for (const child of roi.children) {
    result.add(
      await roiToMesh(
        child,
        animation?.children.find(n => n.name.toLowerCase() === child.name.toLowerCase()),
      ),
    )
  }
  return result
}

export const getWorld = async (name: string): Promise<THREE.Group> => {
  const wdb = await getWdb()
  const world = wdb.worlds.find(w => w.name.toLowerCase() === name.toLowerCase())
  if (world == null) {
    throw new Error(`World ${name} not found`)
  }
  const group = new THREE.Group()
  for (const model of world.models) {
    if (model.roi.name.toLowerCase() === 'isle' || model.roi.name.toLowerCase() === 'isle_lo') {
      continue
    }

    const mesh = await roiToMesh(model.roi, model.animation.tree)
    const matrix = calculateTransformationMatrix(model.position, model.rotation, model.up)
    matrix.decompose(mesh.position, mesh.quaternion, mesh.scale)
    mesh.visible = model.visible
    group.add(mesh)
  }
  return group
}

export const getPart = async (name: string, color: WDB.Color | null, texture: string | THREE.Texture | null): Promise<THREE.Mesh> => {
  const part = (await getWdb()).globalParts.find(p => p.name.toLowerCase() === name.toLowerCase())
  if (!part) {
    throw new Error(`Part ${name} not found`)
  }
  const lod = part.lods.at(-1)
  if (!lod) {
    throw new Error("Couldn't find lod and children")
  }
  const result = new THREE.Mesh()
  result.name = name
  let n = 0
  for (const [geometry, material] of createMeshValues(lod, color, texture, 'part')) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = `${name}-${++n}`
    result.add(mesh)
  }
  return result
}
