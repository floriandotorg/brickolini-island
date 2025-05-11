import { BinaryReader } from './binary-reader'

const decoder = new TextDecoder('ascii')

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
  textureName: string
  materialName: string
  shading: Shading
}
export type Model = { roi: Roi; animation: Animation.Node }
export type Roi = { name: string; lods: Lod[]; children: Roi[]; texture_name: string }
export type Lod = { meshes: Mesh[] }
export namespace Animation {
  export type TimeAndFlags = { time: number; flags: number }
  export type VertexKey = { timeAndFlags: TimeAndFlags; vertex: Vertex }
  export type RotationKey = { timeAndFlags: TimeAndFlags; quaternion: [number, number, number, number] }
  export type MorphKey = { timeAndFlags: TimeAndFlags; bool: boolean }
  export type Node = { name: string; translationKeys: VertexKey[]; rotationKeys: RotationKey[]; scaleKeys: VertexKey[]; morphKeys: MorphKey[]; children: Node[] }
}

export class WDB {
  private _reader: BinaryReader
  private _images: Gif[] = []
  private _textures: Gif[] = []
  private _model_textures: Gif[] = []
  private _models: Model[] = []

  constructor(buffer: ArrayBuffer) {
    this._reader = new BinaryReader(buffer)
    const num_worlds = this._reader.readUint32()
    const parts_offsets: number[] = []
    const models_offsets: number[] = []
    for (let w = 0; w < num_worlds; w += 1) {
      const world_name = this._reader.readString()
      const num_parts = this._reader.readUint32()
      for (let p = 0; p < num_parts; p += 1) {
        this._reader.readString()
        const item_size = this._reader.readUint32()
        const offset = this._reader.readUint32()
        parts_offsets.push(offset)
      }
      const num_models = this._reader.readUint32()
      for (let m = 0; m < num_models; m += 1) {
        this._reader.readString()
        const size = this._reader.readUint32()
        const offset = this._reader.readUint32()
        this._reader.readString()
        for (let i = 0; i < 9; i += 1) {
          this._reader.readFloat32()
        }
        this._reader.skip(1)
        models_offsets.push(offset)
      }
    }
    const gif_chunk_size = this._reader.readUint32()
    const num_frames = this._reader.readUint32()
    for (let i = 0; i < num_frames; i += 1) {
      this._images.push(this._readGif())
    }
    for (const offset of parts_offsets) {
      this._reader.seek(offset)
      const texture_info_offset = this._reader.readUint32()
      this._reader.seek(offset + texture_info_offset)
      const num_textures = this._reader.readUint32()
      for (let i = 0; i < num_textures; i += 1) {
        const texture = this._readGif()
        this._textures.push(texture)
        if (texture.title.startsWith('^')) {
          this._textures.push(this._readGif(texture.title.slice(1)))
        }
      }
    }
    const scanned_offsets = new Set<number>()
    const scanned_model_names = new Set<string>()
    for (const offset of models_offsets) {
      if (scanned_offsets.has(offset)) {
        continue
      }
      scanned_offsets.add(offset)
      this._reader.seek(offset)
      const version = this._reader.readUint32()
      if (version !== 19) {
        throw new Error('invalid version')
      }
      const texture_info_offset = this._reader.readUint32()
      const num_rois = this._reader.readUint32()
      const num_animations = this._reader.readUint32()
      if (num_animations > 0) {
        throw new Error('animations not supported')
      }
      this._reader.readUint32()
      const animation = this._readAnimationTree()
      const roi = this._readRoi(offset, scanned_model_names)
      this._models.push({ roi, animation })
      this._reader.seek(offset + texture_info_offset)
      const num_textures = this._reader.readUint32()
      const skip_textures = this._reader.readUint32()
      for (let i = 0; i < num_textures; i += 1) {
        const texture = this._readGif()
        this._model_textures.push(texture)
        if (texture.title.startsWith('^')) {
          this._model_textures.push(this._readGif(texture.title.slice(1)))
        }
      }
    }
  }

  get images(): Gif[] {
    return this._images
  }
  get textures(): Gif[] {
    return this._textures
  }
  get model_textures(): Gif[] {
    return this._model_textures
  }
  get models(): Model[] {
    return this._models
  }

  texture_by_name = (name: string): Gif => {
    const tex = this._model_textures.find(t => t.title === name)
    if (!tex) {
      throw new Error('texture not found')
    }
    return tex
  }

  private _readRoi = (offset: number, scanned_model_names: Set<string>): Roi => {
    const model_name = this._reader.readString()
    if (scanned_model_names.has(model_name)) {
      console.log(`Already scanned model '${model_name}'!`)
    }
    scanned_model_names.add(model_name)
    this._readVertex()
    this._reader.readFloat32()
    this._readVertex()
    this._readVertex()
    const texture_name = this._reader.readString()
    const defined_elsewhere = this._reader.readInt8()
    const lods: Lod[] = []
    if (defined_elsewhere === 0) {
      const num_lods = this._reader.readUint32()
      if (num_lods !== 0) {
        const end_component_offset = this._reader.readUint32()
        for (let l = 0; l < num_lods; l += 1) {
          lods.push(this._readLod())
        }
        this._reader.seek(offset + end_component_offset)
      }
    } else {
      model_name.replace(/[0-9]+$/, '')
    }
    const children: Roi[] = []
    const num_rois = this._reader.readUint32()
    for (let i = 0; i < num_rois; i++) {
      children.push(this._readRoi(offset, scanned_model_names))
    }
    return { name: model_name, lods, children, texture_name }
  }

  private _readGif = (maybeTitle?: string): Gif => {
    const title = maybeTitle ?? this._reader.readString()
    const width = this._reader.readUint32()
    const height = this._reader.readUint32()
    const num_colors = this._reader.readUint32()
    const colors: Uint8Array[] = []
    for (let i = 0; i < num_colors; i += 1) {
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

  private _readVertex = (): Vertex => [-this._reader.readFloat32(), this._reader.readFloat32(), this._reader.readFloat32()]
  private _readVertices = (count: number): Vertex[] => Array.from({ length: count }, () => this._readVertex())

  private _readTimeAndFlags = (): Animation.TimeAndFlags => {
    const tf = this._reader.readUint32()
    const flags = tf >>> 24
    const time = tf & 0xffffff
    return { time, flags }
  }

  private _readAnimationTree = (): Animation.Node => {
    const name = this._reader.readString()
    const translations: Animation.VertexKey[] = []
    const num_translation_keys = this._reader.readUint16()
    for (let i = 0; i < num_translation_keys; i += 1) {
      const timeAndFlags = this._readTimeAndFlags()
      const vertex = this._readVertex()
      translations.push({ timeAndFlags, vertex })
    }
    const rotations: Animation.RotationKey[] = []
    const num_rotation_keys = this._reader.readUint16()
    for (let i = 0; i < num_rotation_keys; i += 1) {
      const timeAndFlags = this._readTimeAndFlags()
      const w = this._reader.readFloat32()
      const vertex = this._readVertex()
      rotations.push({ timeAndFlags, quaternion: [vertex[0], vertex[1], vertex[2], w] })
    }
    const scales: Animation.VertexKey[] = []
    const num_scale_keys = this._reader.readUint16()
    for (let i = 0; i < num_scale_keys; i += 1) {
      const timeAndFlags = this._readTimeAndFlags()
      const vertex = this._readVertex()
      scales.push({ timeAndFlags, vertex })
    }
    const morphs: Animation.MorphKey[] = []
    const num_morph_keys = this._reader.readUint16()
    for (let i = 0; i < num_morph_keys; i += 1) {
      const timeAndFlags = this._readTimeAndFlags()
      const bool = this._reader.readInt8() !== 0
      morphs.push({ timeAndFlags, bool })
    }
    const children = []
    const num_children = this._reader.readUint32()
    for (let i = 0; i < num_children; i += 1) {
      children.push(this._readAnimationTree())
    }
    return { name, translationKeys: translations, rotationKeys: rotations, scaleKeys: scales, morphKeys: morphs, children }
  }

  private _readLod = (): Lod => {
    const unknown8 = this._reader.readUint32()
    if ((unknown8 & 0xffffff04) !== 0) {
      throw new Error('invalid flags')
    }
    const num_meshes = this._reader.readUint32()
    if (num_meshes === 0) {
      return { meshes: [] }
    }
    const num_verts = this._reader.readUint16()
    let num_normals = this._reader.readUint16()
    num_normals = num_normals >>> 1
    const num_text_verts = this._reader.readUint32()
    const vertices = this._readVertices(num_verts)
    const normals = this._readVertices(num_normals)
    const uvs: [number, number][] = Array.from({ length: num_text_verts }, () => [this._reader.readFloat32(), this._reader.readFloat32()])
    const meshes: Mesh[] = []
    for (let m = 0; m < num_meshes; m += 1) {
      const num_polys = this._reader.readUint16()
      const num_mesh_verts = this._reader.readUint16()
      const vertex_indices_packed: number[] = Array.from({ length: num_polys * 3 }, () => this._reader.readUint32())
      const num_texture_indices = this._reader.readUint32()
      let texture_indices: number[] = []
      if (num_texture_indices > 0) {
        if (num_texture_indices !== num_polys * 3) {
          throw new Error('texture index count mismatch')
        }
        texture_indices = Array.from({ length: num_polys * 3 }, () => this._reader.readUint32())
      }
      const mesh_vertices: Vertex[] = []
      const mesh_normals: Vertex[] = []
      const mesh_uvs: [number, number][] = []
      const indices: number[] = []
      for (let i = 0; i < vertex_indices_packed.length; i += 1) {
        const packed = vertex_indices_packed[i]
        const tex = texture_indices[i]
        if ((packed & 0x80000000) !== 0) {
          indices.push(mesh_vertices.length)
          const gv = packed & 0x7fff
          mesh_vertices.push(vertices[gv])
          const gn = (packed >>> 16) & 0x7fff
          mesh_normals.push(normals[gn])
          if (tex !== undefined && uvs.length > 0) {
            mesh_uvs.push(uvs[tex])
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
      if (mesh_vertices.length !== num_mesh_verts) {
        throw new Error('vertex count mismatch')
      }
      if (mesh_uvs.length !== 0 && mesh_uvs.length !== num_mesh_verts) {
        throw new Error('uv count mismatch')
      }
      const red = this._reader.readUint8()
      const green = this._reader.readUint8()
      const blue = this._reader.readUint8()
      const alpha = 1 - this._reader.readFloat32()
      const shading = this._reader.readInt8()
      this._reader.skip(3)
      const texture_name = this._reader.readString()
      const material_name = this._reader.readString()
      const color: Color = { red, green, blue, alpha }
      meshes.push({ vertices: mesh_vertices, normals: mesh_normals, uvs: mesh_uvs, indices, color, textureName: texture_name, materialName: material_name, shading })
    }
    return { meshes }
  }
}
