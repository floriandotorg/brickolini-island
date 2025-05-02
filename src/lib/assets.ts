import { type SIObject, SIType, SI } from './si'
import { ISO9660, ISOVariant } from './iso'
import { BinaryWriter } from './binary-writer'
import { Smk } from './smk'
import { BinaryReader } from './binary-reader'
import { Shading, WDB, type Gif, type Lod, type Model } from './wdb'
import { setLoading } from './store'
import { FLC } from './flc'
import * as THREE from 'three'

const siFiles: Map<string, SI> = new Map()
let wdb: WDB | null = null

export const initAssets = async (file: File) => {
  const updateLoading = async (progress: number, message: string) => {
    setLoading({ progress, message })
    // hack to update the UI, todo move loading to web worker
    await new Promise(resolve => setTimeout(resolve))
  }

  await updateLoading(0, 'Loading ISO...')

  const iso = new ISO9660(await file.arrayBuffer(), ISOVariant.Joliet)

  const filenames = [
    'Lego/Scripts/INTRO.SI',
    'Lego/Scripts/Build/COPTER.SI',
    'Lego/Scripts/Build/DUNECAR.SI',
    'Lego/Scripts/Build/JETSKI.SI',
    'Lego/Scripts/Build/RACECAR.SI',
    'Lego/Scripts/Race/CARRACE.SI',
    'Lego/Scripts/Race/CARRACER.SI',
    'Lego/Scripts/Race/JETRACE.SI',
    'Lego/Scripts/Race/JETRACER.SI',
    'Lego/Scripts/Isle/ISLE.SI',
    'Lego/Scripts/Infocntr/ELEVBOTT.SI',
    'Lego/Scripts/Infocntr/INFODOOR.SI',
    'Lego/Scripts/Infocntr/INFOMAIN.SI',
    'Lego/Scripts/Infocntr/INFOSCOR.SI',
    'Lego/Scripts/Infocntr/REGBOOK.SI',
    'Lego/Scripts/Infocntr/HISTBOOK.SI',
    'Lego/Scripts/Hospital/HOSPITAL.SI',
    'Lego/Scripts/Police/POLICE.SI',
    'Lego/Scripts/Garage/GARAGE.SI',
    'Lego/Scripts/Act2/ACT2MAIN.SI',
    'Lego/Scripts/Act3/ACT3.SI',
    'Lego/Scripts/Isle/JUKEBOX.SI',
    'Lego/Scripts/Isle/JUKEBOXW.SI',
    'Lego/Scripts/SNDANIM.SI',
    'Lego/Scripts/CREDITS.SI',
  ]
  for (let n = 0; n < filenames.length; n++) {
    const filename = filenames[n].split('/').pop()
    if (filename == null) {
      throw new Error('Filename not found')
    }
    await updateLoading(5 + (n / filenames.length) * 90, `Loading ${filename}...`)
    siFiles.set(filename, new SI(iso.open(filenames[n])))
  }

  await updateLoading(95, 'Loading WDB...')
  wdb = new WDB(iso.open('DATA/disk/LEGO/data/WORLD.WDB'))

  setLoading(null)
}

const parseKeyValueString = (extra: string): Record<string, string> => {
  if (!extra) return {};

  const result: Record<string, string> = {};
  const tokens = extra.split(/[,\s\r\n\t]+/);

  for (let token of tokens) {
    const separatorIndex = token.indexOf(':');
    if (separatorIndex > 0) {
      const key = token.substring(0, separatorIndex).trim();
      const value = token.substring(separatorIndex + 1).trim();

      if (key.length > 0 && value.length > 0) {
        result[key.toLowerCase()] = value;
      }
    }
  }

  return result;
}

export const getBuildings = (): { model_name: string; location: [number, number, number]; direction: [number, number, number] }[] => {
  const si = siFiles.get('ISLE.SI')
  if (!si) {
    throw new Error('Assets not initialized')
  }

  const result: { model_name: string; location: [number, number, number]; direction: [number, number, number] }[] = []

  const root = si.objects.get(0)
  if (!root) {
    throw new Error('Root object not found')
  }

  for (const a of root.children) {
    console.log(`a = ${a.name}`)
    for (const b of a.children) {
      console.log(`  b = ${b.name} with ${b.extraData}`)
      const keyValues = parseKeyValueString(b.extraData)
      console.log(keyValues)
      for (const key in keyValues) {
        if (key == 'db_create') {
          result.push({
            model_name: keyValues[key],
            location: a.location,
            direction: a.direction,
          })
          break
        }
      }
    }
  }

  return result
}

const createWAV = (obj: SIObject): ArrayBuffer => {
  const writeChunk = (writer: BinaryWriter, tag: string, data: Uint8Array) => {
    writer.writeString(tag)
    writer.writeU32(data.length)
    writer.writeBytes(data)
    if (data.length % 2 === 1) {
      writer.writeU8(0)
    }
  }

  const firstChunkSize = obj.chunkSizes[0]
  if (!firstChunkSize) {
    throw new Error('First chunk size not found')
  }

  const contentWriter = new BinaryWriter()
  contentWriter.writeString('WAVE')
  writeChunk(contentWriter, 'fmt ', obj.data.subarray(0, firstChunkSize))
  writeChunk(contentWriter, 'data', obj.data.subarray(firstChunkSize))
  const fileWriter = new BinaryWriter()
  writeChunk(fileWriter, 'RIFF', new Uint8Array(contentWriter.buffer))
  return fileWriter.buffer
}

export const getModel = (name: string): Model => {
  if (wdb == null) {
    throw new Error('Assets not initialized')
  }
  const model = wdb.models.find(m => m.name.toLowerCase() === name.toLowerCase())
  if (model == null) {
    throw new Error(`Model '${name}' not found`)
  }

  return model
}

const createTexture = (image: Gif): THREE.DataTexture => {
  const data = new Uint8Array(image.width * image.height * 4)

  for (let index = 0; index < image.width * image.height; index++) {
    const texIndex = index * 4
    const gifIndex = index * 3
    data.set(image.image.subarray(gifIndex, gifIndex + 3), texIndex)
    data[texIndex + 3] = 0xff
  }

  const tex = new THREE.DataTexture(data, image.width, image.height)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return tex
}

const addLodObject = (lod: Lod, group: THREE.Group) => {
  for (const model_mesh of lod.meshes) {
    const vertices: number[] = model_mesh.vertices.flat()
    const indices: number[] = model_mesh.indices
    const uvs: number[] = model_mesh.uvs.flat()
    const material = (() => {
      switch (model_mesh.shading) {
        case Shading.WireFrame:
          return new THREE.MeshBasicMaterial({ wireframe: true })
        case Shading.Gouraud:
          return new THREE.MeshLambertMaterial()
        case Shading.Flat:
          return new THREE.MeshLambertMaterial({ flatShading: true })
        default:
          throw new Error(`Unknown shading: ${model_mesh.shading}`)
      }
    })()
    const geometry = new THREE.BufferGeometry()
    geometry.setIndex(indices)
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
    geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(model_mesh.normals.flat()), 3))
    if (model_mesh.textureName) {
      material.map = createTexture(getTexture(model_mesh.textureName))
      geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
    } else {
      material.color = new THREE.Color(model_mesh.color.red / 255, model_mesh.color.green / 255, model_mesh.color.blue / 255)
      if (model_mesh.color.alpha < 0.99) {
        material.transparent = true
        material.opacity = model_mesh.color.alpha
      }
    }
    const mesh = new THREE.Mesh(geometry, material)
    group.add(mesh)
  }
}

const getModelObjectBase = (model: Model): THREE.Group => {
  const lod = model.lods.at(-1)
  if (!lod && !model.children) {
    throw new Error("Couldn't find lod and children")
  }
  const group = new THREE.Group()
  if (lod) {
    addLodObject(lod, group)
  }
  for (const child of model.children) {
    const childGroup = getModelObjectBase(child)
    group.add(childGroup)
  }
  return group
}

export const getModelObject = (name: string): THREE.Group => {
  const model = getModel(name)
  return getModelObjectBase(model)
}

export const getTexture = (name: string): Gif => {
  if (wdb == null) {
    throw new Error('Assets not initialized')
  }
  return wdb.texture_by_name(name)
}

export const getAnimation = (siName: string, name: string): FLC => {
  const si = siFiles.get(siName)
  if (si == null) {
    throw new Error('Assets not initialized')
  }

  const flc = Array.from(si.objects.values()).find(o => o.name === name)
  if (flc == null) {
    throw new Error('Animation not found')
  }

  const dest = new BinaryWriter()
  let offset = 0
  for (const [index, chunkSize] of flc.chunkSizes.entries()) {
    console.log(index, chunkSize)

    let chunk = flc.data.subarray(offset, offset + chunkSize)
    if (index > 0) {
      if (chunkSize === 20) {
        chunk = new Uint8Array([0x10, 0x00, 0x00, 0x00, 0xfa, 0xf1, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
      } else {
        chunk = chunk.subarray(20)
      }
    }
    if (chunk.length > 0) {
      dest.writeBytes(chunk)
    }
    offset += chunkSize
  }
  return new FLC(dest.buffer)
}

export const getMovie = (name: string): { audio: ArrayBuffer; video: Smk } => {
  const si = siFiles.get('INTRO.SI')
  if (si == null) {
    throw new Error('Assets not initialized')
  }

  const movie = Array.from(si.objects.values()).find(o => o.name === name)
  if (movie == null) {
    throw new Error('Movie not found')
  }

  const audio = movie.children.find(c => c.type === SIType.Sound)
  if (audio == null) {
    throw new Error('Audio not found')
  }

  const video = movie.children.find(c => c.type === SIType.Video)
  if (video == null) {
    throw new Error('Video not found')
  }

  return { audio: createWAV(audio), video: new Smk(new BinaryReader(video.data.buffer)) }
}
