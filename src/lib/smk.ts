import type { BinaryReader } from './binary-reader'

const HUFF8_BRANCH = 0x8000
const HUFF8_LEAF_MASK = 0x7fff

const HUFF16_BRANCH = 0x80000000 >>> 0
const HUFF16_LEAF_MASK = 0x3fffffff
const HUFF16_CACHE = 0x40000000

enum FrameType {
  Mono = 0,
  Full = 1,
  Void = 2,
  Solid = 3,
}

interface Huff16 {
  tree: number[] // mixed branch/leaf encodings – see design doc
  cache: Uint16Array // LRU cache, length 3
}

export class Smk {
  private readonly _reader: BinaryReader

  private _width = 0
  private _height = 0
  private _numFrames = 0
  private _frameRate = 10 // frame duration in ms – derived from header

  private _frameSizes: number[] = []
  private _frameTypes: number[] = []

  private _currentFrame = 0

  // State for bit‑level Huffman reads
  private _currentByte = 0
  private _currentBit = 0

  // Huffman lookup structures
  private _mmap!: Huff16
  private _mclr!: Huff16
  private _full!: Huff16
  private _type!: Huff16

  // Palette – 256 × RGB triplets (24‑bit, no alpha)
  private readonly _palette = new Uint8Array(256 * 3)

  // Decoded output for the current frame (RGB24 packed)
  private _frameData!: Uint8Array

  constructor(reader: BinaryReader) {
    this._reader = reader

    // Header --------------------------------------------------
    const signature = this._reader.readString(4)
    if (signature !== 'SMK2') {
      throw new Error(`Invalid SMK signature: ${signature}`)
    }

    this._width = this._reader.readUint32()
    this._height = this._reader.readUint32()
    this._numFrames = this._reader.readUint32()

    const frameRate = this._reader.readInt32()
    if (frameRate > 0) {
      this._frameRate = 1000 / frameRate
    } else if (frameRate < 0) {
      this._frameRate = 100000 / -frameRate
    } else {
      this._frameRate = 10
    }

    const flags = this._reader.readUint32()
    if (flags !== 0) {
      throw new Error(`Unsupported flags: ${flags}`)
    }

    this._reader.skip(28) // reserved bytes in header
    const treesSize = this._reader.readUint32()
    this._reader.skip(48) // more reserved bytes

    // Per‑frame tables ---------------------------------------
    this._frameSizes = new Array<number>(this._numFrames)
    for (let i = 0; i < this._numFrames; ++i) {
      this._frameSizes[i] = this._reader.readUint32()
    }

    this._frameTypes = new Array<number>(this._numFrames)
    for (let i = 0; i < this._numFrames; ++i) {
      this._frameTypes[i] = this._reader.readUint8()
      if ((this._frameTypes[i] & ~0x01) !== 0) {
        throw new Error('Audio is not supported')
      }
    }

    // Save position of Huffman trees, then skip past them so we can come back.
    const endOfTrees = this._reader.position + treesSize

    // Build Huffman tables -----------------------------------
    this._initBitstream()
    this._mmap = this._buildHuff16()
    this._mclr = this._buildHuff16()
    this._full = this._buildHuff16()
    this._type = this._buildHuff16()

    // After reading the four trees, we should be at endOfTrees
    this._reader.seek(endOfTrees)

    // Basic validation ---------------------------------------
    if ((this._width & 3) !== 0 || (this._height & 3) !== 0) {
      throw new Error('Width and height must be divisible by 4')
    }

    // Palette starts black; first frame often contains keyframe palette
    this._palette.fill(0)

    // Pre‑allocate frame buffer (RGB24)
    this._frameData = new Uint8Array(this._width * this._height * 3)
    this._frameData.fill(0)
  }

  get width() {
    return this._width
  }

  get height() {
    return this._height
  }

  get numFrames() {
    return this._numFrames
  }

  get frameRate() {
    return this._frameRate
  }

  decodeFrame(): Uint8Array {
    if (this._currentFrame >= this._numFrames) {
      throw new Error('All frames have been decoded')
    }

    const rawSize = this._frameSizes[this._currentFrame]
    const dataSize = rawSize & ~0x03 // lower 2 bits are flags
    const endOfFrame = this._reader.position + dataSize

    // Update palette if needed
    if ((this._frameTypes[this._currentFrame] & 0x01) !== 0) {
      this._readPalette()
    }

    // Clear Huffman caches – spec says they reset each frame
    this._mmap.cache.fill(0)
    this._mclr.cache.fill(0)
    this._full.cache.fill(0)
    this._type.cache.fill(0)

    this._initBitstream()

    const sizeTable = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 128, 256, 512, 1024, 2048]

    let row = 0
    let col = 0

    while (row < this._height) {
      const block = this._lookupHuff16(this._type)

      const type = block & 0x0003
      const blockLen = (block & 0x00fc) >>> 2
      const typeData = (block & 0xff00) >>> 8

      const repeat = sizeTable[blockLen]
      if (!repeat) {
        throw new Error(`Invalid block length: ${blockLen}`)
      }

      for (let k = 0; k < repeat && row < this._height; ++k) {
        const baseIdx = (row * this._width + col) * 3

        switch (type) {
          case FrameType.Mono: {
            const colors = this._lookupHuff16(this._mclr)
            const map = this._lookupHuff16(this._mmap)

            const c1Idx = (colors >>> 8) & 0xff
            const c2Idx = colors & 0xff

            const color1 = this._getPaletteColor(c1Idx)
            const color2 = this._getPaletteColor(c2Idx)

            for (let dy = 0; dy < 4; ++dy) {
              for (let dx = 0; dx < 4; ++dx) {
                const tgt = baseIdx + (dy * this._width + dx) * 3
                const bit = (map >>> (dy * 4 + dx)) & 1
                this._frameData.set(bit ? color1 : color2, tgt)
              }
            }
            break
          }

          case FrameType.Full: {
            for (let dy = 0; dy < 4; ++dy) {
              // Two pixels per Huff lookup (C++ does pairs)
              let fullVal = this._lookupHuff16(this._full)
              const c1 = this._getPaletteColor((fullVal >>> 8) & 0xff)
              const c2 = this._getPaletteColor(fullVal & 0xff)
              this._frameData.set(c1, baseIdx + (dy * this._width + 3) * 3)
              this._frameData.set(c2, baseIdx + (dy * this._width + 2) * 3)

              fullVal = this._lookupHuff16(this._full)
              const c3 = this._getPaletteColor((fullVal >>> 8) & 0xff)
              const c4 = this._getPaletteColor(fullVal & 0xff)
              this._frameData.set(c3, baseIdx + (dy * this._width + 1) * 3)
              this._frameData.set(c4, baseIdx + (dy * this._width + 0) * 3)
            }
            break
          }

          case FrameType.Void:
            // Skip (leave previous frame data intact)
            break

          case FrameType.Solid: {
            const color = this._getPaletteColor(typeData & 0xff)
            for (let dy = 0; dy < 4; ++dy) {
              for (let dx = 0; dx < 4; ++dx) {
                const tgt = baseIdx + (dy * this._width + dx) * 3
                this._frameData.set(color, tgt)
              }
            }
            break
          }

          default:
            throw new Error(`Invalid block type: ${type}`)
        }

        // Advance 4×4 macroblock cursor
        col += 4
        if (col >= this._width) {
          col = 0
          row += 4
        }
      }
    }

    // Prepare for next frame
    ++this._currentFrame
    this._reader.seek(endOfFrame)

    return this._frameData
  }

  private _initBitstream(): void {
    this._currentByte = this._reader.readUint8()
    this._currentBit = 0
  }

  private _bitstreamReadBit(): boolean {
    const result = (this._currentByte >> this._currentBit) & 1
    ++this._currentBit
    if (this._currentBit > 7) {
      this._currentByte = this._reader.readUint8()
      this._currentBit = 0
    }
    return result !== 0
  }

  private _bitstreamReadByte(): number {
    if (this._currentBit === 0) {
      const b = this._currentByte
      this._currentByte = this._reader.readUint8()
      return b
    }

    const result = this._currentByte >>> this._currentBit
    this._currentByte = this._reader.readUint8()
    return ((this._currentByte << (8 - this._currentBit)) & 0xff) | result
  }

  private _buildHuff16(): Huff16 {
    if (!this._bitstreamReadBit()) {
      throw new Error('Huff16 not present')
    }

    const lowTree = this._buildHuff8()
    const highTree = this._buildHuff8()

    const tree: Huff16 = {
      tree: [],
      cache: new Uint16Array(3),
    }

    tree.cache[0] = this._bitstreamReadByte() | (this._bitstreamReadByte() << 8)
    tree.cache[1] = this._bitstreamReadByte() | (this._bitstreamReadByte() << 8)
    tree.cache[2] = this._bitstreamReadByte() | (this._bitstreamReadByte() << 8)

    this._buildHuff16Rec(tree, lowTree, highTree)

    if (this._bitstreamReadBit()) {
      throw new Error('Error reading huff16')
    }

    return tree
  }

  private _lookupHuff16(tree: Huff16): number {
    let idx = 0
    while ((tree.tree[idx] & HUFF16_BRANCH) !== 0) {
      if (this._bitstreamReadBit()) {
        idx = tree.tree[idx] & HUFF16_LEAF_MASK
      } else {
        ++idx
      }
    }

    let value = tree.tree[idx]
    if ((value & HUFF16_CACHE) !== 0) {
      value = tree.cache[value & HUFF16_LEAF_MASK]
    }

    if (value !== tree.cache[0]) {
      // Simple hand‑rolled rotate right 1: [2,0,1]
      tree.cache[2] = tree.cache[1]
      tree.cache[1] = tree.cache[0]
      tree.cache[0] = value
    }

    return value
  }

  private _buildHuff16Rec(tree: Huff16, lowTree: number[], highTree: number[]): void {
    if (this._bitstreamReadBit()) {
      const branchIdx = tree.tree.length
      tree.tree.push(0)
      this._buildHuff16Rec(tree, lowTree, highTree) // left
      tree.tree[branchIdx] = HUFF16_BRANCH | tree.tree.length
      this._buildHuff16Rec(tree, lowTree, highTree) // right
    } else {
      let value = this._lookupHuff8(lowTree) | (this._lookupHuff8(highTree) << 8)
      if (value === tree.cache[0]) value = HUFF16_CACHE
      else if (value === tree.cache[1]) value = HUFF16_CACHE | 1
      else if (value === tree.cache[2]) value = HUFF16_CACHE | 2
      tree.tree.push(value)
    }
  }

  private _buildHuff8(): number[] {
    if (!this._bitstreamReadBit()) {
      throw new Error('Huff8 not present')
    }

    const tree: number[] = []
    this._buildHuff8Rec(tree)

    if (this._bitstreamReadBit()) {
      throw new Error('Error reading huff8')
    }

    return tree
  }

  private _buildHuff8Rec(tree: number[]): void {
    if (this._bitstreamReadBit()) {
      const branchIdx = tree.length
      tree.push(0)
      this._buildHuff8Rec(tree) // left
      tree[branchIdx] = HUFF8_BRANCH | tree.length
      this._buildHuff8Rec(tree) // right
    } else {
      const value = this._bitstreamReadByte()
      tree.push(value)
    }
  }

  private _lookupHuff8(tree: number[]): number {
    let idx = 0
    while ((tree[idx] & HUFF8_BRANCH) !== 0) {
      if (this._bitstreamReadBit()) {
        idx = tree[idx] & HUFF8_LEAF_MASK
      } else {
        ++idx
      }
    }
    return tree[idx]
  }

  // ----------------------------------------------------------
  // Palette handling
  // ----------------------------------------------------------

  private readonly _palMap: Uint8Array = new Uint8Array([
    0x00, 0x04, 0x08, 0x0c, 0x10, 0x14, 0x18, 0x1c, 0x20, 0x24, 0x28, 0x2c, 0x30, 0x34, 0x38, 0x3c, 0x41, 0x45, 0x49, 0x4d, 0x51, 0x55, 0x59, 0x5d, 0x61, 0x65, 0x69, 0x6d, 0x71, 0x75, 0x79, 0x7d, 0x82, 0x86, 0x8a, 0x8e, 0x92, 0x96, 0x9a, 0x9e, 0xa2, 0xa6, 0xaa, 0xae, 0xb2, 0xb6, 0xba, 0xbe, 0xc3, 0xc7, 0xcb, 0xcf,
    0xd3, 0xd7, 0xdb, 0xdf, 0xe3, 0xe7, 0xeb, 0xef, 0xf3, 0xf7, 0xfb, 0xff,
  ])

  private _readPalette(): void {
    // Save current palette for copy blocks
    const oldPal = this._palette.slice()

    const paletteSize = this._reader.readUint8() * 4
    const paletteEnd = this._reader.position + paletteSize

    let idx = 0 // colour index (0‑255)

    while (this._reader.position < paletteEnd && idx < 256) {
      const block = this._reader.readUint8()
      if (block & 0x80) {
        // Skip N entries (block & 0x7F) + 1
        idx += (block & 0x7f) + 1
      } else if (block & 0x40) {
        // Copy colours from old palette
        const count = (block & 0x3f) + 1
        const src = this._reader.readUint8()
        for (let i = 0; i < count && idx < 256; ++i) {
          const srcOff = (src + i) * 3
          const dstOff = idx * 3
          this._palette.set(oldPal.subarray(srcOff, srcOff + 3), dstOff)
          ++idx
        }
      } else {
        // Literal triple (6‑bit indices into palMap)
        const r = this._palMap[block & 0x3f]
        const g = this._palMap[this._reader.readUint8() & 0x3f]
        const b = this._palMap[this._reader.readUint8() & 0x3f]
        const off = idx * 3
        this._palette[off] = r
        this._palette[off + 1] = g
        this._palette[off + 2] = b
        ++idx
      }
    }

    // Seek to end of palette block, in case we bailed early
    this._reader.seek(paletteEnd)
  }

  // Helper to fetch a palette colour as a 3‑byte Uint8Array slice
  private _getPaletteColor(index: number): Uint8Array {
    const off = index * 3
    // slice() returns a *copy*, we want a view => subarray
    return this._palette.subarray(off, off + 3)
  }
}
