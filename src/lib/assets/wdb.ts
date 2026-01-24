import { BinaryReader } from './binary-reader'

export namespace WDB {
  export enum Shading {
    Flat = 0,
    Gouraud = 1,
    WireFrame = 2,
  }

  export type Vertex = [number, number, number]
  export type Gif = { title: string; width: number; height: number; image: Uint8Array }
  export type Color = { red: number; green: number; blue: number; alpha: number }
  export type Mesh = {
    vertices: Vertex[]
    normals: Vertex[]
    uvs: [number, number][]
    indices: number[]
    color: Color
    useColorAlias: boolean
    textureName: string
    materialName: string
    shading: Shading
  }
  export type Model = { roi: Roi; animation: Animation.Animation; position: [number, number, number]; rotation: [number, number, number]; up: [number, number, number]; visible: boolean }
  export interface Lods {
    type: 'lods'
    lods: Lod[]
  }
  export interface Reference {
    type: 'reference'
    reference: string
  }
  export type Roi = { name: string; data: Lods | Reference; children: Roi[]; textureName: string; boundingSphere: { radius: number; center: [number, number, number] } }
  export class Lod {
    public constructor(
      public readonly meshesBeforeOffset: Mesh[],
      public readonly meshesAfterOffset: Mesh[],
    ) {}

    public get length() {
      return this.meshesBeforeOffset.length + this.meshesAfterOffset.length
    }

    public get meshes() {
      return this.meshesBeforeOffset.concat(this.meshesAfterOffset)
    }
  }
  export enum ActorType {
    Unknown = 1,
    ManagedActor = 2,
    ManagedInvisibleRoiTrimmed = 3,
    ManagedInvisibleRoi = 4,
    SceneRoi1 = 5,
    SceneRoi2 = 6,
  }
  const numberToActorType = (value: number): ActorType => {
    switch (value) {
      case 1:
        return ActorType.Unknown
      case 2:
        return ActorType.ManagedActor
      case 3:
        return ActorType.ManagedInvisibleRoiTrimmed
      case 4:
        return ActorType.ManagedInvisibleRoi
      case 5:
        return ActorType.SceneRoi1
      case 6:
        return ActorType.SceneRoi2
      default:
        throw new Error(`Unknown actor type: ${value}`)
    }
  }
  export type Part = { name: string; lods: Lod[] }
  export namespace Animation {
    export type TimeAndFlags = { time: number; flags: number }
    export type VertexKey = { timeAndFlags: TimeAndFlags; vertex: Vertex }
    export type RotationKey = { timeAndFlags: TimeAndFlags; quaternion: [number, number, number, number] }
    export type MorphKey = { timeAndFlags: TimeAndFlags; bool: boolean }
    export type Node = { name: string; translationKeys: VertexKey[]; rotationKeys: RotationKey[]; scaleKeys: VertexKey[]; morphKeys: MorphKey[]; children: Node[] }
    export type Animation = { actors: { name: string; type: ActorType | null }[]; tree: Node; duration: number; cameraAnimation: { translationKeys: VertexKey[]; lookAtKeys: VertexKey[]; zRotationKeys: { timeAndFlags: TimeAndFlags; z: number }[] } | null }

    export const readTimeAndFlags = (reader: BinaryReader): Animation.TimeAndFlags => {
      const tf = reader.readUint32()
      const flags = tf >>> 24
      const time = tf & 0xffffff
      return { time, flags }
    }

    export const readTranslationKeys = (reader: BinaryReader): Animation.VertexKey[] => {
      const result: Animation.VertexKey[] = []
      const numTranslationKeys = reader.readUint16()
      for (let n = 0; n < numTranslationKeys; ++n) {
        const timeAndFlags = readTimeAndFlags(reader)
        const vertex = reader.readVector3()
        if (vertex[0] > 1e-5 || vertex[0] < -1e-5 || vertex[1] > 1e-5 || vertex[1] < -1e-5 || vertex[2] > 1e-5 || vertex[2] < -1e-5) {
          timeAndFlags.flags |= 0x01
        }
        result.push({ timeAndFlags, vertex })
      }
      return result
    }

    const readAnimationTree = (reader: BinaryReader): Node => {
      const name = reader.readString()
      const translations = readTranslationKeys(reader)
      const rotations: Animation.RotationKey[] = []
      const numRotationKeys = reader.readUint16()
      for (let n = 0; n < numRotationKeys; ++n) {
        const timeAndFlags = readTimeAndFlags(reader)
        const w = reader.readFloat32()
        const x = -reader.readFloat32()
        const y = reader.readFloat32()
        const z = reader.readFloat32()
        if (w !== 1) {
          timeAndFlags.flags |= 0x01
        }
        rotations.push({ timeAndFlags, quaternion: [x, y, z, w] })
      }
      const scales: Animation.VertexKey[] = []
      const numScaleKeys = reader.readUint16()
      for (let n = 0; n < numScaleKeys; ++n) {
        const timeAndFlags = readTimeAndFlags(reader)
        const vertex = reader.readVector3()
        // readVector3 is mirroring the x axis
        vertex[0] = -vertex[0]
        // this is done in the original code, but the flag is never used, so we skip it here
        // if (vertex[0] > 1.00001 || vertex[0] < 0.99999 || vertex[1] > 1.00001 || vertex[1] < 0.99999 || vertex[2] > 1.00001 || vertex[2] < 0.99999) {
        //   timeAndFlags.flags |= 0x01;
        // }
        scales.push({ timeAndFlags, vertex })
      }
      const morphs: Animation.MorphKey[] = []
      const numMorphKeys = reader.readUint16()
      for (let n = 0; n < numMorphKeys; ++n) {
        const timeAndFlags = readTimeAndFlags(reader)
        const bool = reader.readInt8() !== 0
        morphs.push({ timeAndFlags, bool })
      }
      const children = []
      const numChildren = reader.readUint32()
      for (let n = 0; n < numChildren; ++n) {
        children.push(readAnimationTree(reader))
      }
      return { name, translationKeys: translations, rotationKeys: rotations, scaleKeys: scales, morphKeys: morphs, children }
    }

    export const readAnimation = (reader: BinaryReader, parseScene: boolean): Animation => {
      const numActors = reader.readUint32()
      const actors: { name: string; type: number }[] = []
      for (let n = 0; n < numActors; ++n) {
        const actor = reader.readString()
        if (actor.length > 0) {
          actors.push({ name: actor.toLowerCase(), type: numberToActorType(reader.readUint32()) })
        }
      }
      const duration = reader.readInt32()
      let cameraAnimation: Animation['cameraAnimation'] | null = null
      if (parseScene) {
        const translationKeys = WDB.Animation.readTranslationKeys(reader)
        const lookAtKeys = WDB.Animation.readTranslationKeys(reader)
        const zRotationKeys: { timeAndFlags: WDB.Animation.TimeAndFlags; z: number }[] = []
        const numTranslationKeys = reader.readUint16()
        for (let n = 0; n < numTranslationKeys; ++n) {
          const timeAndFlags = WDB.Animation.readTimeAndFlags(reader)
          const z = reader.readFloat32()
          zRotationKeys.push({ timeAndFlags, z })
        }
        cameraAnimation = {
          translationKeys,
          lookAtKeys,
          zRotationKeys,
        }
      }
      const tree = readAnimationTree(reader)
      return { actors, tree, duration, cameraAnimation }
    }
  }

  export class World {
    public name = ''
    public parts: Part[] = []
    public models: Model[] = []
  }

  export const readModel = (reader: BinaryReader): { roi: Roi; animation: Animation.Animation; textures: Gif[] } => {
    const offset = reader.position
    const version = reader.readUint32()
    if (version !== 19) {
      throw new Error('invalid version')
    }
    const textureInfoOffset = reader.readUint32()
    const _numRois = reader.readUint32()
    const animation = Animation.readAnimation(reader, false)
    const roi = readRoi(reader, offset)
    reader.seek(offset + textureInfoOffset)
    const numTextures = reader.readUint32()
    const _skipTextures = reader.readUint32()
    const textures: Gif[] = []
    for (let i = 0; i < numTextures; i += 1) {
      const texture = readGif(reader)
      textures.push(texture)
      if (texture.title.startsWith('^')) {
        textures.push(readGif(reader, texture.title.slice(1)))
      }
    }
    return { roi, animation, textures }
  }

  const readRoi = (reader: BinaryReader, offset: number): Roi => {
    const modelName = reader.readString()
    const center = reader.readVector3()
    const radius = reader.readFloat32()
    const _boxMin = reader.readVector3()
    const _boxMax = reader.readVector3()
    const textureName = reader.readString()
    const definedElsewhere = reader.readInt8()
    const data = (() => {
      if (definedElsewhere === 0) {
        const lods: Lods = { lods: [], type: 'lods' }
        const numLods = reader.readUint32()
        if (numLods !== 0) {
          const endComponentOffset = reader.readUint32()
          for (let n = 0; n < numLods; ++n) {
            lods.lods.push(readLod(reader))
          }
          reader.seek(offset + endComponentOffset)
        }
        return lods
      }
      const reference: Reference = { reference: modelName.replace(/[0-9]+$/, ''), type: 'reference' }
      return reference
    })()
    const children: Roi[] = []
    const numRois = reader.readUint32()
    for (let n = 0; n < numRois; ++n) {
      children.push(readRoi(reader, offset))
    }
    return { name: modelName, data, children, textureName, boundingSphere: { radius, center } }
  }

  const readLod = (reader: BinaryReader): Lod => {
    const unknown8 = reader.readUint32()
    if ((unknown8 & 0xffffff04) !== 0) {
      throw new Error('invalid flags')
    }
    const numMeshes = reader.readUint32()
    if (numMeshes === 0) {
      return new Lod([], [])
    }
    const numVerts = reader.readUint16()
    let numNormals = reader.readUint16()
    numNormals = numNormals >>> 1
    const numTextVerts = reader.readUint32()
    const vertices = readVertices(reader, numVerts)
    const normals = readVertices(reader, numNormals)
    const uvs: [number, number][] = Array.from({ length: numTextVerts }, () => [reader.readFloat32(), reader.readFloat32()])
    const meshesBeforeOffset: Mesh[] = []
    const meshesAfterOffset: Mesh[] = []
    for (let m = 0; m < numMeshes; m += 1) {
      const numPolys = reader.readUint16()
      const numMeshVerts = reader.readUint16()
      const vertexIndicesPacked: number[] = Array.from({ length: numPolys * 3 }, () => reader.readUint32())
      const numTextureIndices = reader.readUint32()
      let textureIndices: number[] = []
      if (numTextureIndices > 0) {
        if (numTextureIndices !== numPolys * 3) {
          throw new Error('texture index count mismatch')
        }
        textureIndices = Array.from({ length: numPolys * 3 }, () => reader.readUint32())
      }
      const meshVertices: Vertex[] = []
      const meshNormals: Vertex[] = []
      const meshUvs: [number, number][] = []
      const indices: number[] = []
      for (let i = 0; i < vertexIndicesPacked.length; i += 1) {
        const packed = vertexIndicesPacked[i]
        const tex = textureIndices[i]
        if ((packed & 0x80000000) !== 0) {
          indices.push(meshVertices.length)
          const gv = packed & 0x7fff
          meshVertices.push(vertices[gv])
          const gn = (packed >>> 16) & 0x7fff
          meshNormals.push(normals[gn])
          if (tex !== undefined && uvs.length > 0) {
            meshUvs.push(uvs[tex])
          }
        } else {
          indices.push(packed & 0x7fff)
        }
      }
      for (let i = 0; i < indices.length; i += 3) {
        const temp = indices[i]
        indices[i] = indices[i + 2]
        indices[i + 2] = temp
      }
      if (meshVertices.length !== numMeshVerts) {
        throw new Error('vertex count mismatch')
      }
      if (meshUvs.length !== 0 && meshUvs.length !== numMeshVerts) {
        throw new Error('uv count mismatch')
      }
      const red = reader.readUint8()
      const green = reader.readUint8()
      const blue = reader.readUint8()
      const alpha = 1 - reader.readFloat32()
      const shading = reader.readInt8()
      reader.skip(2)
      const useColorAlias = reader.readUint8() !== 0
      const textureName = reader.readString()
      const materialName = reader.readString()
      const color: Color = { red, green, blue, alpha }
      const meshes = textureName.toLowerCase().startsWith('inh') || materialName.toLowerCase().startsWith('inh') ? meshesAfterOffset : meshesBeforeOffset
      meshes.push({ vertices: meshVertices, normals: meshNormals, uvs: meshUvs, indices, color, useColorAlias, textureName: textureName, materialName: materialName, shading })
    }
    return new Lod(meshesBeforeOffset, meshesAfterOffset)
  }

  const readVertices = (reader: BinaryReader, count: number): Vertex[] => Array.from({ length: count }, () => reader.readVector3())

  const readGif = (reader: BinaryReader, maybeTitle?: string): Gif => {
    const title = maybeTitle ?? reader.readString()
    const width = reader.readUint32()
    const height = reader.readUint32()
    const numColors = reader.readUint32()
    const colors: Uint8Array[] = []
    for (let i = 0; i < numColors; i += 1) {
      const r = reader.readUint8()
      const g = reader.readUint8()
      const b = reader.readUint8()
      colors.push(Uint8Array.of(r, g, b))
    }
    const image = new Uint8Array(width * height * 3)
    let pos = 0
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const pix = reader.readUint8()
        image.set(colors[pix], pos)
        pos += 3
      }
    }
    return { title, width, height, image }
  }

  export class File {
    private _reader: BinaryReader
    private _images: Gif[] = []
    private _textures: Gif[] = []
    private _modelTextures: Gif[] = []
    private _globalParts: Part[] = []
    private _worlds: World[] = []

    constructor(buffer: ArrayBuffer) {
      this._reader = new BinaryReader(buffer)
      const numWorlds = this._reader.readUint32()
      const worlds = new Map<
        string,
        {
          name: string
          partsOffsets: number[]
          modelsOffsets: {
            offset: number
            position: [number, number, number]
            rotation: [number, number, number]
            up: [number, number, number]
            visible: boolean
          }[]
        }
      >()
      for (let n = 0; n < numWorlds; ++n) {
        const worldName = this._reader.readString()
        const numParts = this._reader.readUint32()
        const partsOffsets = []
        for (let m = 0; m < numParts; ++m) {
          this._reader.readString()
          const _itemSize = this._reader.readUint32()
          const offset = this._reader.readUint32()
          partsOffsets.push(offset)
        }
        const numModels = this._reader.readUint32()
        const modelsOffsets = []
        for (let m = 0; m < numModels; ++m) {
          this._reader.readString()
          const _size = this._reader.readUint32()
          const offset = this._reader.readUint32()
          this._reader.readString()
          const position = this._reader.readVector3()
          const rotation = this._reader.readVector3()
          const up = this._reader.readVector3()
          const visible = this._reader.readInt8() !== 0
          modelsOffsets.push({ position, rotation, up, offset, visible })
        }
        worlds.set(worldName, { name: worldName, partsOffsets, modelsOffsets })
      }
      const _gifChunkSize = this._reader.readUint32()
      const numFrames = this._reader.readUint32()
      for (let n = 0; n < numFrames; ++n) {
        this._images.push(this._readGif())
      }
      const _modelChunkSize = this._reader.readUint32()
      this._globalParts = this._readParts(this._reader.position)
      for (const [worldName, { partsOffsets, modelsOffsets }] of worlds) {
        const world = new World()
        world.name = worldName
        for (const offset of partsOffsets) {
          this._reader.seek(offset)
          world.parts.push(...this._readParts(offset))
        }
        for (const { offset, position, rotation, up, visible } of modelsOffsets) {
          this._reader.seek(offset)
          const { roi, animation, textures } = readModel(this._reader)
          world.models.push({ roi, animation, position, rotation, up, visible })
          this._modelTextures.push(...textures)
        }
        this._worlds.push(world)
      }
    }

    get images(): Gif[] {
      return this._images
    }
    get textures(): Gif[] {
      return this._textures
    }
    get modelTextures(): Gif[] {
      return this._modelTextures
    }
    get worlds(): World[] {
      return this._worlds
    }
    get globalParts(): Part[] {
      return this._globalParts
    }

    textureByName = (name: string, source: 'model' | 'part' | 'image'): Gif => {
      const textures = (() => {
        switch (source) {
          case 'model':
            return this._modelTextures
          case 'part':
            return this._textures
          case 'image':
            return this._images
        }
      })()
      const tex = textures.find(t => t.title.toLowerCase() === name.toLowerCase())
      if (!tex) {
        throw new Error(`texture '${name}' in ${source} not found`)
      }
      return tex
    }

    private _readGif = (maybeTitle?: string): Gif => readGif(this._reader, maybeTitle)

    private _readParts = (offset: number): Part[] => {
      const parts: Part[] = []
      const textureInfoOffset = this._reader.readUint32()
      const numRois = this._reader.readUint32()

      for (let i = 0; i < numRois; ++i) {
        const roiName = this._reader.readString()

        const numLods = this._reader.readUint32()
        const _roiInfoOffset = this._reader.readUint32()

        const lods: Lod[] = []
        for (let n = 0; n < numLods; ++n) {
          const lod = readLod(this._reader)
          if (lod.length !== 0) {
            lods.push(lod)
          }
        }

        parts.push({ name: roiName, lods })
      }

      this._reader.seek(offset + textureInfoOffset)
      const numTextures = this._reader.readUint32()
      for (let t = 0; t < numTextures; ++t) {
        const texture = this._readGif()
        this._textures.push(texture)
        if (texture.title.startsWith('^')) {
          this._textures.push(this._readGif(texture.title.slice(1)))
        }
      }
      return parts
    }
  }
}
