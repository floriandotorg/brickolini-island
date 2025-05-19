import * as THREE from 'three'
import { BinaryReader } from './binary-reader'
import { BinaryWriter } from './binary-writer'
import type { Dashboards } from './dashboard'
import { FLC } from './flc'
import { ISO9660, ISOVariant } from './iso'
import { MusicKeys } from './music'
import { SI, SIFileType, type SIObject, SIType } from './si'
import { Smk } from './smk'
import { setLoading } from './store'
import { type Animation, type Gif, type Lod, type Model, type Roi, Shading, WDB } from './wdb'

const siFiles: Map<string, SI> = new Map()
const musicBuffer: Map<MusicKeys, AudioBuffer> = new Map()
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
  const musicBufferPromises: Map<number, Promise<AudioBuffer>> = new Map()
  for (let n = 0; n < filenames.length; n++) {
    const filename = filenames[n].split('/').pop()
    if (filename == null) {
      throw new Error('Filename not found')
    }
    await updateLoading(5 + (n / filenames.length) * 85, `Loading ${filename}...`)
    const si = new SI(iso.open(filenames[n]))
    siFiles.set(filename, si)

    if (filename === 'JUKEBOX.SI') {
      const audioCtx = new AudioContext()
      for (const value of Object.values(MusicKeys)) {
        if (typeof value === 'number') {
          const audio = si.objects.get(value)
          if (audio && audio.fileType === SIFileType.WAV) {
            const wavFile = createWAV(audio)
            const buffer = audioCtx.decodeAudioData(wavFile)
            musicBufferPromises.set(value, buffer)
          }
        }
      }
    }
  }

  await updateLoading(90, 'Loading Music...')
  const resolvedBuffers = await Promise.all(musicBufferPromises.values())

  const keys = Array.from(musicBufferPromises.keys())
  keys.forEach((key, i) => {
    musicBuffer.set(key, resolvedBuffers[i])
  })

  await updateLoading(95, 'Loading WDB...')
  wdb = new WDB(iso.open('DATA/disk/LEGO/data/WORLD.WDB'))

  parseBoundaries()

  setLoading(null)
}

type Struct = {
  name: string
  flags: number
}

type FaceInfo = {
  faceBoundaryIndex: number
  ccwEdgeIndex: number
  cwEdgeIndex: number
}

export class Edge {
  public flags: number
  public pointA: THREE.Vector3
  public pointB: THREE.Vector3
  public faceInfoA?: FaceInfo
  public faceInfoB?: FaceInfo
  public faceA?: Boundary
  public faceB?: Boundary
  public ccwEdgeA?: Edge
  public cwEdgeA?: Edge
  public ccwEdgeB?: Edge
  public cwEdgeB?: Edge
  public direction: THREE.Vector3
  public unknown2: number

  constructor(flags: number, pointA: THREE.Vector3, pointB: THREE.Vector3, faceInfoA: FaceInfo | undefined, faceInfoB: FaceInfo | undefined, direction: THREE.Vector3, unknown2: number) {
    this.flags = flags
    this.pointA = pointA
    this.pointB = pointB
    this.faceInfoA = faceInfoA
    this.faceInfoB = faceInfoB
    this.direction = direction
    this.unknown2 = unknown2
  }

  public getCCWEdge(face: Boundary): Edge | null {
    if (this.faceA === face) {
      return this.ccwEdgeA ?? null
    }
    if (this.faceB === face) {
      return this.ccwEdgeB ?? null
    }
    return null
  }

  public connectFaces(edges: Edge[], boundaries: Boundary[]) {
    if (this.faceInfoA) {
      this.faceA = boundaries[this.faceInfoA.faceBoundaryIndex]
      this.ccwEdgeA = edges[this.faceInfoA.ccwEdgeIndex]
      this.cwEdgeA = edges[this.faceInfoA.cwEdgeIndex]

      if (this.faceA == null || this.ccwEdgeA == null || this.cwEdgeA == null) {
        throw new Error('Face or edge not found')
      }
    }

    if (this.faceInfoB) {
      this.faceB = boundaries[this.faceInfoB.faceBoundaryIndex]
      this.ccwEdgeB = edges[this.faceInfoB.ccwEdgeIndex]
      this.cwEdgeB = edges[this.faceInfoB.cwEdgeIndex]

      if (this.faceB == null || this.ccwEdgeB == null || this.cwEdgeB == null) {
        throw new Error('Face or edge not found')
      }
    }
  }
}

type PathTrigger = {
  struct: Struct
  data: number
  triggerProjection: number
}

export class Boundary {
  public edges: Edge[]
  public flags: number
  public unknown: number
  public up: THREE.Vector4
  public planes: THREE.Vector4[]
  public unknownVec3: THREE.Vector3
  public unknownFloat: number
  public triggers: PathTrigger[]
  public direction?: THREE.Vector3

  constructor(edges: Edge[], flags: number, unknown: number, up: THREE.Vector4, planes: THREE.Vector4[], unknownVec3: THREE.Vector3, unknownFloat: number, triggers: PathTrigger[], direction?: THREE.Vector3) {
    this.edges = edges
    this.flags = flags
    this.unknown = unknown
    this.up = up
    this.planes = planes
    this.unknownVec3 = unknownVec3
    this.unknownFloat = unknownFloat
    this.triggers = triggers
    this.direction = direction
  }
}

export const boundaryMap = new Map<string, Map<string, Boundary>>()

export const getBoundary = (name: string, boundaryName: string): Boundary | undefined => {
  const boundaries = boundaryMap.get(name)
  if (!boundaries) {
    return undefined
  }
  return boundaries.get(boundaryName)
}

const parseBoundaries = () => {
  for (const [name, si] of siFiles.entries()) {
    for (const obj of si.objects.values()) {
      if (obj.type === SIType.ObjectAction && obj.presenter === 'LegoPathPresenter') {
        const reader = new BinaryReader(obj.data.buffer)
        const numStructs = reader.readUint16()
        const numNodes = reader.readUint16()
        const numEdges = reader.readUint16()
        const numBoundaries = reader.readUint16()

        const structs: Struct[] = []
        for (let n = 0; n < numStructs; ++n) {
          structs.push({ name: reader.readString('u8'), flags: reader.readUint32() })
        }

        const location = new THREE.Vector3(obj.location[0], obj.location[1], obj.location[2])
        const nodes: THREE.Vector3[] = []
        for (let n = 0; n < numNodes; ++n) {
          nodes.push(new THREE.Vector3(...reader.readVector3()).add(location))
        }

        const getNode = (index: number) => {
          if (index >= nodes.length) {
            throw new Error(`Node index out of bounds: ${index} >= ${nodes.length} (${name})`)
          }
          return nodes[index]
        }

        const edges: Edge[] = []
        for (let n = 0; n < numEdges; ++n) {
          edges.push(new Edge(reader.readUint16(), getNode(reader.readUint16()), getNode(reader.readUint16()), undefined, undefined, new THREE.Vector3(), 0))

          if (edges[n].flags & 0x04) {
            edges[n].faceInfoA = {
              faceBoundaryIndex: reader.readUint16(),
              ccwEdgeIndex: reader.readUint16(),
              cwEdgeIndex: reader.readUint16(),
            }
          }

          if (edges[n].flags & 0x08) {
            edges[n].faceInfoB = {
              faceBoundaryIndex: reader.readUint16(),
              ccwEdgeIndex: reader.readUint16(),
              cwEdgeIndex: reader.readUint16(),
            }
          }

          edges[n].direction = new THREE.Vector3(...reader.readVector3())
          edges[n].unknown2 = reader.readFloat32()
        }

        const boundaries: Boundary[] = []
        const boundariesMap: Map<string, Boundary> = new Map()
        for (let n = 0; n < numBoundaries; ++n) {
          const numEdges = reader.readUint8()
          const boundaryEdges: Edge[] = []
          for (let n = 0; n < numEdges; ++n) {
            const idx = reader.readUint16()
            if (idx >= edges.length) {
              throw new Error(`Edge index out of bounds: ${idx} >= ${edges.length}`)
            }
            boundaryEdges.push(edges[idx])
          }
          const flags = reader.readUint8()
          const unknown = reader.readUint8()
          const name = reader.readString('u8')
          const up = new THREE.Vector4(...reader.readVector4())
          const unknowns: THREE.Vector4[] = []
          for (let n = 0; n < numEdges; ++n) {
            unknowns.push(new THREE.Vector4(...reader.readVector4()))
          }
          const unknownVec3 = new THREE.Vector3(...reader.readVector3()) // unknown
          const unknownFloat = reader.readFloat32() // unknown
          const numTriggers = reader.readUint8()
          let direction: THREE.Vector3 | undefined
          const triggers: PathTrigger[] = []
          if (numTriggers > 0) {
            for (let n = 0; n < numTriggers; ++n) {
              triggers.push({
                struct: structs[reader.readUint16()],
                data: reader.readUint32(),
                triggerProjection: reader.readFloat32(),
              })
            }
            direction = new THREE.Vector3(...reader.readVector3())
          }
          const boundary = new Boundary(boundaryEdges, flags, unknown, up, unknowns, unknownVec3, unknownFloat, triggers, direction)
          boundaries.push(boundary)
          boundariesMap.set(name, boundary)
        }

        for (const boundary of boundaries) {
          for (const edge of boundary.edges) {
            edge.connectFaces(edges, boundaries)
          }
        }

        boundaryMap.set(name, boundariesMap)
      }
    }
  }
}

export const getBuildings = (): { model_name: string; location: [number, number, number]; direction: [number, number, number]; up: [number, number, number] }[] => {
  const si = siFiles.get('ISLE.SI')
  if (!si) {
    throw new Error('Assets not initialized')
  }

  const result: { model_name: string; location: [number, number, number]; direction: [number, number, number]; up: [number, number, number] }[] = []

  const root = si.objects.get(0)
  if (!root) {
    throw new Error('Root object not found')
  }

  for (const parent of root.children) {
    for (const model of parent.children) {
      const value = model.extraValues.find('db_create')
      if (value) {
        result.push({
          model_name: value,
          location: parent.location,
          direction: parent.direction,
          up: parent.up,
        })
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

export const createAudioBuffer = async (obj: SIObject, audioCtx: AudioContext): Promise<AudioBuffer> => {
  const wav = createWAV(obj)
  return await audioCtx.decodeAudioData(wav)
}

export const getModel = (name: string): Model => {
  if (wdb == null) {
    throw new Error('Assets not initialized')
  }
  const model = wdb.models.find(m => m.roi.name.toLowerCase() === name.toLowerCase())
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

const createMeshValues = (lod: Lod): [THREE.BufferGeometry, THREE.Material][] => {
  const result: [THREE.BufferGeometry, THREE.Material][] = []
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
    result.push([geometry, material])
  }
  return result
}

const getModelObjectBase = (model: Roi, animation: Animation.Node | undefined): THREE.Group => {
  const lod = model.lods.at(-1)
  if (!lod && !model.children) {
    throw new Error("Couldn't find lod and children")
  }

  const group = new THREE.Group()
  group.name = model.name
  if (animation) {
    if (animation.translationKeys.length === 1) {
      if (animation.translationKeys[0].timeAndFlags.time !== 0) {
        console.log(`Translation key for model ${model.name} has non-zero time of ${animation.translationKeys[0].timeAndFlags.time}`)
      }
      if (animation.translationKeys[0].timeAndFlags.flags !== 1) {
        console.log(`Translation key for model ${model.name} has non-standard flags of ${animation.translationKeys[0].timeAndFlags.flags}`)
      }
      group.position.set(...animation.translationKeys[0].vertex)
    } else if (animation.translationKeys.length > 1) {
      console.log(`Model ${model.name} has ${animation.translationKeys.length} translation keys`)
    }
    if (animation.rotationKeys.length === 1) {
      if (animation.rotationKeys[0].timeAndFlags.time !== 0) {
        console.log(`Rotation key for model ${model.name} has non-zero time of ${animation.rotationKeys[0].timeAndFlags.time}`)
      }
      if (animation.rotationKeys[0].timeAndFlags.flags !== 1) {
        console.log(`Rotation key for model ${model.name} has non-standard flags of ${animation.rotationKeys[0].timeAndFlags.flags}`)
      }
      group.quaternion.set(...animation.rotationKeys[0].quaternion)
    } else if (animation.rotationKeys.length > 1) {
      console.log(`Model ${model.name} has ${animation.rotationKeys.length} rotation keys`)
    }
    if (animation.scaleKeys.length > 0) {
      console.log(`Model ${model.name} has ${animation.scaleKeys.length} scale keys`)
    }
    if (animation.morphKeys.length > 0) {
      console.log(`Model ${model.name} has ${animation.morphKeys.length} morph keys`)
    }
  }
  if (lod) {
    for (const [geometry, material] of createMeshValues(lod)) {
      const mesh = new THREE.Mesh(geometry, material)
      group.add(mesh)
    }
  }
  for (const child of model.children) {
    const childAnimation = animation?.children.find(n => n.name.toLowerCase() === child.name.toLowerCase())
    const childGroup = getModelObjectBase(child, childAnimation)
    group.add(childGroup)
  }
  return group
}

export const getModelObject = (name: string): THREE.Group => {
  const model = getModel(name)
  return getModelObjectBase(model.roi, model.animation)
}

export class InstancedModel {
  private readonly _meshes: THREE.InstancedMesh[]
  public readonly group: THREE.Group

  constructor(meshes: THREE.InstancedMesh[]) {
    if (!meshes) {
      throw new Error('No meshes provided')
    }
    const instanceCount = meshes[0].count
    for (const mesh of meshes) {
      if (mesh.count !== instanceCount) {
        throw new Error(`Not all meshes have the same number of instances (${instanceCount} and ${mesh.count})`)
      }
    }
    this._meshes = meshes
    this.group = new THREE.Group()
  }

  public setMatrixAt(index: number, matrix: THREE.Matrix4) {
    for (const mesh of this._meshes) {
      mesh.setMatrixAt(index, matrix)
    }
  }

  public addTo(scene: THREE.Scene) {
    for (const mesh of this._meshes) {
      scene.add(mesh)
    }
  }
}

export const getModelInstanced = (name: string, count: number): InstancedModel => {
  const model = getModel(name)
  if (model.roi.children.length > 0) {
    throw new Error('Instanced models do not support children (yet?)')
  }
  const lod = model.roi.lods.at(-1)
  if (!lod) {
    throw new Error("Couldn't find lod and children")
  }
  const meshes: THREE.InstancedMesh[] = []
  for (const [geometry, material] of createMeshValues(lod)) {
    const mesh = new THREE.InstancedMesh(geometry, material, count)
    meshes.push(mesh)
  }
  const result = new InstancedModel(meshes)
  result.group.name = model.roi.name
  return result
}

export const getTexture = (name: string): Gif => {
  if (wdb == null) {
    throw new Error('Assets not initialized')
  }
  return wdb.texture_by_name(name)
}

export const getDashboard = (dashboard: Dashboards): SIObject => {
  const si = siFiles.get('ISLE.SI')
  if (si == null) {
    throw new Error('Assets not initialized')
  }

  const dashboardObj = si.objects.get(dashboard)
  if (!dashboardObj) {
    throw new Error('Dashboard not found')
  }
  return dashboardObj
}

export const getMusic = (music: MusicKeys): AudioBuffer => {
  if (!musicBuffer) {
    throw new Error('Assets not initialized')
  }
  const audioBuffer = musicBuffer.get(music)
  if (!audioBuffer) {
    throw new Error('Audio not found')
  }
  return audioBuffer
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

  const video = movie.children.find(c => c.type === SIType.Anim)
  if (video == null) {
    throw new Error('Video not found')
  }

  return { audio: createWAV(audio), video: new Smk(new BinaryReader(video.data.buffer)) }
}
