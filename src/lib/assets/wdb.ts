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
  export type Roi = { name: string; lods: Lod[]; children: Roi[]; textureName: string; position: [number, number, number] }
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
    export type Animation = { actors: { name: string; type: ActorType | null }[]; tree: Node; duration: number }

    const readTimeAndFlags = (reader: BinaryReader): Animation.TimeAndFlags => {
      const tf = reader.readUint32()
      const flags = tf >>> 24
      const time = tf & 0xffffff
      return { time, flags }
    }

    const readAnimationTree = (reader: BinaryReader): Node => {
      const name = reader.readString()
      const translations: Animation.VertexKey[] = []
      const numTranslationKeys = reader.readUint16()
      for (let n = 0; n < numTranslationKeys; ++n) {
        const timeAndFlags = readTimeAndFlags(reader)
        const vertex = reader.readVector3()
        translations.push({ timeAndFlags, vertex })
      }
      const rotations: Animation.RotationKey[] = []
      const numRotationKeys = reader.readUint16()
      for (let n = 0; n < numRotationKeys; ++n) {
        const timeAndFlags = readTimeAndFlags(reader)
        const w = reader.readFloat32()
        const x = -reader.readFloat32()
        const y = reader.readFloat32()
        const z = reader.readFloat32()
        rotations.push({ timeAndFlags, quaternion: [x, y, z, w] })
      }
      const scales: Animation.VertexKey[] = []
      const numScaleKeys = reader.readUint16()
      for (let n = 0; n < numScaleKeys; ++n) {
        const timeAndFlags = readTimeAndFlags(reader)
        const vertex = reader.readVector3()
        // readVector3 is mirroring the x axis
        vertex[0] = -vertex[0]
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

    export const readAnimation = (reader: BinaryReader): Animation => {
      const numActors = reader.readUint32()
      const actors: { name: string; type: number }[] = []
      for (let n = 0; n < numActors; ++n) {
        const actor = reader.readString()
        if (actor.length > 0) {
          actors.push({ name: actor.toLowerCase(), type: numberToActorType(reader.readUint32()) })
        }
      }
      const duration = reader.readInt32()
      const tree = readAnimationTree(reader)
      return { actors, tree, duration }
    }
  }

  export class World {
    public name: string = ''
    public parts: Part[] = []
    public models: Model[] = []
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
          const version = this._reader.readUint32()
          if (version !== 19) {
            throw new Error('invalid version')
          }
          const textureInfoOffset = this._reader.readUint32()
          const _numRois = this._reader.readUint32()
          const animation = Animation.readAnimation(this._reader)
          const roi = this._readRoi(offset)
          world.models.push({ roi, animation, position, rotation, up, visible })
          this._reader.seek(offset + textureInfoOffset)
          const numTextures = this._reader.readUint32()
          const _skipTextures = this._reader.readUint32()
          for (let i = 0; i < numTextures; i += 1) {
            const texture = this._readGif()
            this._modelTextures.push(texture)
            if (texture.title.startsWith('^')) {
              this._modelTextures.push(this._readGif(texture.title.slice(1)))
            }
          }
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

    private _readRoi = (offset: number): Roi => {
      const modelName = this._reader.readString()
      const _sphereCenter = this._reader.readVector3()
      const _sphereRadius = this._reader.readFloat32()
      const _boxMin = this._reader.readVector3()
      const _boxMax = this._reader.readVector3()
      const textureName = this._reader.readString()
      const definedElsewhere = this._reader.readInt8()
      const lods: Lod[] = []
      if (definedElsewhere === 0) {
        const numLods = this._reader.readUint32()
        if (numLods !== 0) {
          const endComponentOffset = this._reader.readUint32()
          for (let n = 0; n < numLods; ++n) {
            lods.push(this._readLod())
          }
          this._reader.seek(offset + endComponentOffset)
        }
      } else {
        modelName.replace(/[0-9]+$/, '')
      }
      const children: Roi[] = []
      const numRois = this._reader.readUint32()
      for (let n = 0; n < numRois; ++n) {
        children.push(this._readRoi(offset))
      }
      return { name: modelName, lods, children, textureName, position: _sphereCenter }
    }

    private _readGif = (maybeTitle?: string): Gif => {
      const title = maybeTitle ?? this._reader.readString()
      const width = this._reader.readUint32()
      const height = this._reader.readUint32()
      const numColors = this._reader.readUint32()
      const colors: Uint8Array[] = []
      for (let i = 0; i < numColors; i += 1) {
        const r = this._reader.readUint8()
        const g = this._reader.readUint8()
        const b = this._reader.readUint8()
        colors.push(Uint8Array.of(r, g, b))
      }
      const image = new Uint8Array(width * height * 3)
      let pos = 0
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const pix = this._reader.readUint8()
          image.set(colors[pix], pos)
          pos += 3
        }
      }
      return { title, width, height, image }
    }

    private _readVertices = (count: number): Vertex[] => Array.from({ length: count }, () => this._reader.readVector3())

    private _readLod = (): Lod => {
      const unknown8 = this._reader.readUint32()
      if ((unknown8 & 0xffffff04) !== 0) {
        throw new Error('invalid flags')
      }
      const numMeshes = this._reader.readUint32()
      if (numMeshes === 0) {
        return new Lod([], [])
      }
      const numVerts = this._reader.readUint16()
      let numNormals = this._reader.readUint16()
      numNormals = numNormals >>> 1
      const numTextVerts = this._reader.readUint32()
      const vertices = this._readVertices(numVerts)
      const normals = this._readVertices(numNormals)
      const uvs: [number, number][] = Array.from({ length: numTextVerts }, () => [this._reader.readFloat32(), this._reader.readFloat32()])
      const meshesBeforeOffset: Mesh[] = []
      const meshesAfterOffset: Mesh[] = []
      for (let m = 0; m < numMeshes; m += 1) {
        const numPolys = this._reader.readUint16()
        const numMeshVerts = this._reader.readUint16()
        const vertexIndicesPacked: number[] = Array.from({ length: numPolys * 3 }, () => this._reader.readUint32())
        const numTextureIndices = this._reader.readUint32()
        let textureIndices: number[] = []
        if (numTextureIndices > 0) {
          if (numTextureIndices !== numPolys * 3) {
            throw new Error('texture index count mismatch')
          }
          textureIndices = Array.from({ length: numPolys * 3 }, () => this._reader.readUint32())
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
        const red = this._reader.readUint8()
        const green = this._reader.readUint8()
        const blue = this._reader.readUint8()
        const alpha = 1 - this._reader.readFloat32()
        const shading = this._reader.readInt8()
        this._reader.skip(2)
        const useColorAlias = this._reader.readUint8() !== 0
        const textureName = this._reader.readString()
        const materialName = this._reader.readString()
        const color: Color = { red, green, blue, alpha }
        const meshes = textureName.toLowerCase().startsWith('inh') || materialName.toLowerCase().startsWith('inh') ? meshesAfterOffset : meshesBeforeOffset
        meshes.push({ vertices: meshVertices, normals: meshNormals, uvs: meshUvs, indices, color, useColorAlias, textureName: textureName, materialName: materialName, shading })
      }
      return new Lod(meshesBeforeOffset, meshesAfterOffset)
    }

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
          const lod = this._readLod()
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
