import { BinaryReader } from './binary-reader'

const decoder = new TextDecoder('ascii')

export enum ChunkType {
  CEL_DATA = 3,
  COLOR_256 = 4,
  DELTA_FLC = 7,
  COLOR_64 = 11,
  DELTA_FLI = 12,
  BLACK = 13,
  BYTE_RUN = 15,
  FLI_COPY = 16,
  PSTAMP = 18,
  DTA_BRUN = 25,
  DTA_COPY = 26,
  DTA_LC = 27,
  LABEL = 31,
  BMP_MASK = 32,
  MLEV_MASK = 33,
  SEGMENT = 34,
  KEY_IMAGE = 35,
  KEY_PAL = 36,
  REGION = 37,
  WAVE = 38,
  USERSTRING = 39,
  RGN_MASK = 40,
  LABELEX = 41,
  SHIFT = 42,
  PATHMAP = 43,
  PREFIX_TYPE = 0xf100,
  SCRIPT_CHUNK = 0xf1e0,
  FRAME_TYPE = 0xf1fa,
  SEGMENT_TABLE = 0xf1fb,
  HUFFMAN_TABLE = 0xf1fc,
}

type Color = { r: number; g: number; b: number }

export class FLC {
  private _reader: BinaryReader
  private _width = 0
  private _height = 0
  private _delayMs = 0
  private _frames: Uint8Array[] = []
  private _palette: Color[] = Array.from({ length: 256 }, () => ({ r: 0, g: 0, b: 0 }))
  private _currentFrame = 0

  constructor(buffer: ArrayBuffer) {
    this._reader = new BinaryReader(buffer)
    const size = this._reader.readUint32()
    const type = this._reader.readUint16()
    const frames = this._reader.readUint16()
    this._width = this._reader.readUint16()
    this._height = this._reader.readUint16()
    this._reader.skip(4)
    this._delayMs = this._reader.readUint32()
    this._reader.skip(108)
    if (type !== 0xaf12) {
      throw new Error('invalid flc')
    }
    for (let i = 0; i < frames; i += 1) {
      this._readChunk()
    }
  }

  get width() {
    return this._width
  }

  get height() {
    return this._height
  }

  get numFrames() {
    return this._frames.length
  }

  get frameRate() {
    return Math.floor(1000 / this._delayMs)
  }

  frames = (): Uint8Array[] => this._frames

  decodeFrame(): Uint8Array {
    if (this._currentFrame >= this.numFrames) {
      throw new Error('All frames have been decoded')
    }
    return this._frames[this._currentFrame++]
  }

  private _readChunk = (): void => {
    const chunkSize = this._reader.readUint32()
    const chunkType = this._reader.readUint16() as ChunkType
    const end = this._reader.position + chunkSize - 6
    switch (chunkType) {
      case ChunkType.FRAME_TYPE: {
        const chunks = this._reader.readUint16()
        const zeros = this._reader.readBytes(8)
        if ([...zeros].some(b => b !== 0)) {
          throw new Error('unsupported settings')
        }
        if (chunks === 0) {
          if (this._frames.length === 0) {
            throw new Error('missing previous frame')
          }
          this._frames.push(this._frames[this._frames.length - 1])
        } else {
          for (let i = 0; i < chunks; i += 1) {
            this._readChunk()
          }
        }
        break
      }
      case ChunkType.COLOR_256:
      case ChunkType.COLOR_64: {
        const packets = this._reader.readUint16()
        let idx = 0
        for (let i = 0; i < packets; i += 1) {
          const skip = this._reader.readUint8()
          let count = this._reader.readUint8()
          idx += skip
          if (count === 0) {
            count = 256
          }
          for (let j = 0; j < count; j += 1) {
            const r = this._reader.readUint8()
            const g = this._reader.readUint8()
            const b = this._reader.readUint8()
            this._palette[idx++] = { r, g, b }
          }
        }
        break
      }
      case ChunkType.BYTE_RUN: {
        const frame = new Uint8Array(this._width * this._height * 3)
        let pos = 0
        for (let y = 0; y < this._height; y += 1) {
          this._reader.skip(1)
          let pixels = 0
          while (pixels < this._width) {
            const count = this._reader.readInt8()
            if (count === 0) {
              throw new Error('invalid count')
            }
            if (count < 0) {
              const src = this._reader.readBytes(-count)
              for (let k = 0; k < src.length; k += 1) {
                const { r, g, b } = this._palette[src[k]]
                frame[pos++] = r
                frame[pos++] = g
                frame[pos++] = b
              }
              pixels += -count
            } else {
              const val = this._reader.readUint8()
              const { r, g, b } = this._palette[val]
              for (let k = 0; k < count; k += 1) {
                frame[pos++] = r
                frame[pos++] = g
                frame[pos++] = b
              }
              pixels += count
            }
          }
        }
        if (pos !== frame.length) {
          throw new Error('frame length mismatch')
        }
        this._frames.push(frame)
        break
      }
      case ChunkType.DELTA_FLC: {
        if (this._frames.length === 0) {
          throw new Error('missing base frame')
        }
        const frame = new Uint8Array(this._frames[this._frames.length - 1])
        const lines = this._reader.readUint16()
        let line = 0
        for (let i = 0; i < lines; i += 1) {
          let pixel = 0
          while (true) {
            const opcode = this._reader.readUint16()
            const code = opcode >> 14
            if (code === 0) {
              const packets = opcode
              for (let p = 0; p < packets; p += 1) {
                const skip = this._reader.readUint8()
                const count = this._reader.readInt8()
                pixel += skip
                if (count < 0) {
                  const p1 = this._reader.readUint8()
                  const p2 = this._reader.readUint8()
                  const { r: r1, g: g1, b: b1 } = this._palette[p1]
                  const { r: r2, g: g2, b: b2 } = this._palette[p2]
                  const pos = (line * this._width + pixel) * 3
                  for (let n = 0; n < -count; n += 1) {
                    const off = pos + n * 6
                    frame[off] = r1
                    frame[off + 1] = g1
                    frame[off + 2] = b1
                    frame[off + 3] = r2
                    frame[off + 4] = g2
                    frame[off + 5] = b2
                  }
                  pixel += -count * 2
                } else if (count > 0) {
                  const bytes = this._reader.readBytes(count * 2)
                  const pos = (line * this._width + pixel) * 3
                  for (let n = 0; n < count; n += 1) {
                    const c1 = this._palette[bytes[n * 2]]
                    const c2 = this._palette[bytes[n * 2 + 1]]
                    const off = pos + n * 6
                    frame[off] = c1.r
                    frame[off + 1] = c1.g
                    frame[off + 2] = c1.b
                    frame[off + 3] = c2.r
                    frame[off + 4] = c2.g
                    frame[off + 5] = c2.b
                  }
                  pixel += count * 2
                } else {
                  throw new Error('invalid count')
                }
              }
              break
            }
            if (code === 2) {
              const col = this._palette[opcode & 0xff]
              const pos = (line * this._width + this._width - 1) * 3
              frame[pos] = col.r
              frame[pos + 1] = col.g
              frame[pos + 2] = col.b
            } else if (code === 3) {
              line -= opcode - 0x10000
            } else {
              throw new Error('undefined opcode')
            }
          }
          line += 1
        }
        this._frames.push(frame)
        break
      }
      case ChunkType.PSTAMP: {
        this._reader.skip(chunkSize - 6)
        break
      }
      case ChunkType.FLI_COPY: {
        const frame = new Uint8Array(this._width * this._height * 3)
        for (let i = 0; i < this._width * this._height; i += 1) {
          const col = this._palette[this._reader.readUint8()]
          frame[i * 3] = col.r
          frame[i * 3 + 1] = col.g
          frame[i * 3 + 2] = col.b
        }
        this._frames.push(frame)
        break
      }
      case ChunkType.BLACK: {
        this._frames.push(new Uint8Array(this._width * this._height * 3))
        break
      }
      default: {
        throw new Error(`unsupported chunk type ${chunkType}`)
      }
    }
    if (this._reader.position < end) {
      this._reader.seek(end)
    }
  }
}
