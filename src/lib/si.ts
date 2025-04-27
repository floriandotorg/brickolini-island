import { BinaryReader } from './binary-reader'

const decoder = new TextDecoder('ascii')

export enum SIType {
  Null = -1,
  Video = 0x03,
  Sound = 0x04,
  World = 0x06,
  Presenter = 0x07,
  Event = 0x08,
  Animation = 0x09,
  Bitmap = 0x0a,
  Object = 0x0b,
}

export enum SIFlags {
  LoopCache = 0x01,
  NoLoop = 0x02,
  LoopStream = 0x04,
  Transparent = 0x08,
  Unknown = 0x20,
}

export enum SIFileType {
  WAV = 0x56415720,
  STL = 0x4c545320,
  FLC = 0x434c4620,
  SMK = 0x4b4d5320,
  OBJ = 0x4a424f20,
  TVE = 0x54564520,
}

export enum SIChunkFlags {
  Split = 0x10,
  End = 0x02,
}

export enum SIVersion {
  Version2_1 = 0x00010002,
  Version2_2 = 0x00020002,
}

const u32 = (v: string) => v.charCodeAt(0) | (v.charCodeAt(1) << 8) | (v.charCodeAt(2) << 16) | (v.charCodeAt(3) << 24)

const TAGS = {
  RIFF: u32('RIFF'),
  MxHd: u32('MxHd'),
  pad_: u32('pad '),
  MxOf: u32('MxOf'),
  LIST: u32('LIST'),
  MxCh: u32('MxCh'),
  MxSt: u32('MxSt'),
  MxDa: u32('MxDa'),
  WAVE: u32('WAVE'),
  fmt_: u32('fmt_'),
  data: u32('data'),
  OMNI: u32('OMNI'),
  MxOb: u32('MxOb'),
}

const HEADER_SIZE = 8
const CHUNK_HEADER_SIZE = 14

export class SIObject {
  constructor(
    public type: SIType,
    public presenter: string,
    public name: string,
    public id: number,
    public flags: number,
    public duration: number,
    public loops: number,
    public location: [number, number, number],
    public direction: [number, number, number],
    public up: [number, number, number],
    public filename?: string,
    public fileType?: SIFileType,
    public volume?: number,
    public data: Uint8Array = new Uint8Array(),
    public chunkSizes: number[] = [],
    public children: SIObject[] = [],
  ) {}

  open = () => {
    return new Blob([this.data]).stream()
  }
}

export class SI {
  private reader: BinaryReader
  private bufferSize = 0
  private objectList = new Map<number, SIObject>()
  private version?: SIVersion
  private splitChunkBytesWritten = 0

  constructor(buffer: ArrayBuffer) {
    this.reader = new BinaryReader(buffer)
    this.readChunk()
  }

  get objects() {
    return this.objectList
  }

  private readChunk = (parents: SIObject[] = []) => {
    const reader = this.reader
    const pos = reader.position
    const magic = reader.readUint32()
    const size = reader.readUint32()
    const end = pos + 8 + size
    let current: SIObject | undefined
    switch (magic) {
      case TAGS.RIFF:
        if (decoder.decode(reader.readBytes(4)) !== 'OMNI') {
          throw new Error('Invalid SI file')
        }
        break
      case TAGS.MxHd:
        this.version = reader.readUint32() as SIVersion
        this.bufferSize = reader.readUint32()
        reader.skip(4)
        break
      case TAGS.pad_:
        reader.skip(size)
        break
      case TAGS.MxOf: {
        reader.skip(4)
        const realCount = size / 4 - 1
        reader.skip(realCount * 4)
        break
      }
      case TAGS.LIST:
        if (decoder.decode(reader.readBytes(4)) === 'MxCh') {
          if (this.version === SIVersion.Version2_1) {
            throw new Error('Version 2.1 not supported')
          }
          const listVar = decoder.decode(reader.readBytes(4))
          if (listVar === 'Act\u0000' || listVar === 'RAND') {
            if (listVar === 'RAND') {
              reader.skip(5)
            }
            reader.skip(2 * reader.readUint32())
          }
        }
        break
      case TAGS.MxSt:
      case TAGS.MxDa:
      case TAGS.WAVE:
      case TAGS.fmt_:
      case TAGS.data:
      case TAGS.OMNI:
        break
      case TAGS.MxOb: {
        const type = reader.readUint16() as SIType
        const presenter = reader.readString()
        reader.skip(4)
        const name = reader.readString()
        const id = reader.readUint32()
        const flags = reader.readUint32()
        reader.skip(4)
        const duration = reader.readUint32()
        const loops = reader.readUint32()
        const coords: number[] = []
        for (let i = 0; i < 9; i++) {
          coords.push(reader.readFloat64())
        }
        const extraSkip = reader.readUint16()
        if (extraSkip) {
          reader.skip(extraSkip)
        }
        let filename: string | undefined
        let fileType: SIFileType | undefined
        let volume: number | undefined
        if (type !== SIType.Presenter && type !== SIType.World && type !== SIType.Animation) {
          filename = reader.readString()
          reader.skip(12)
          fileType = reader.readUint32() as SIFileType
          reader.skip(8)
          if (fileType === SIFileType.WAV) {
            volume = reader.readUint32()
          }
        }
        const obj = new SIObject(type, presenter, name, id, flags, duration, loops, [coords[0], coords[1], coords[2]], [coords[3], coords[4], coords[5]], [coords[6], coords[7], coords[8]], filename, fileType, volume)
        this.objectList.set(id, obj)
        const parent = parents.at(-1)
        if (parent) {
          parent.children.push(obj)
        }
        current = obj
        break
      }
      case TAGS.MxCh: {
        const flags = reader.readUint16()
        const id = reader.readUint32()
        reader.skip(4)
        const totalSize = reader.readUint32()
        const sizeWithoutHeader = size - CHUNK_HEADER_SIZE
        const data = reader.readBytes(sizeWithoutHeader)
        if ((flags & SIChunkFlags.End) === 0) {
          const obj = this.objectList.get(id)
          if (!obj) {
            throw new Error(`Object ${id} not found`)
          }
          const combined = new Uint8Array(obj.data.length + data.length)
          combined.set(obj.data)
          combined.set(data, obj.data.length)
          obj.data = combined
          if (this.splitChunkBytesWritten === 0) {
            obj.chunkSizes.push(totalSize)
          }
          if ((flags & SIChunkFlags.Split) !== 0) {
            this.splitChunkBytesWritten += sizeWithoutHeader
            if (this.splitChunkBytesWritten >= totalSize) {
              this.splitChunkBytesWritten = 0
            }
          }
        }
        break
      }
      default: {
        throw new Error(`Unknown chunk ${magic} at ${pos.toString(16)}`)
      }
    }
    while (reader.position + HEADER_SIZE < end) {
      if (this.bufferSize > 0) {
        const offset = reader.position % this.bufferSize
        if (offset + HEADER_SIZE > this.bufferSize) {
          reader.skip(this.bufferSize - offset)
        }
      }
      this.readChunk(current ? [...parents, current] : parents)
    }
    reader.seek(end)
    if (size % 2 === 1) {
      reader.skip(1)
    }
  }
}
