import { BinaryReader } from './binary-reader'

const SECTOR_SIZE = 2048

export enum ISOVariant {
  ISO9660 = 1,
  Joliet = 2,
}

const asciiDecoder = new TextDecoder('ascii')
const utf16beDecoder = new TextDecoder('utf-16be')

export class ISO9660 {
  private reader: BinaryReader
  private entries = new Map<string, { loc: number; len: number }>()
  private buffer: ArrayBuffer
  private variant: ISOVariant

  constructor(buffer: ArrayBuffer, variant: ISOVariant = ISOVariant.Joliet) {
    this.buffer = buffer
    this.reader = new BinaryReader(buffer)
    this.variant = variant
    const sector = variant === ISOVariant.Joliet ? 17 : 16
    const type = this.getVDType(sector)
    if (variant === ISOVariant.Joliet) {
      if (type !== 2) {
        throw new Error('Bad PVD')
      }
    } else {
      if (type !== 1) {
        throw new Error('Bad PVD')
      }
    }
    this.reader.skip(151)
    const pvdLoc = this.reader.readUint32()
    this.reader.skip(4)
    const pvdLen = this.reader.readUint32()
    this.readDir(pvdLoc, pvdLen, '')
  }

  private getVDType = (sector: number) => {
    this.reader.seek(sector * SECTOR_SIZE)
    const t = this.reader.readUint8()
    const id = asciiDecoder.decode(this.reader.readBytes(5))
    const v = this.reader.readUint8()
    if (id !== 'CD001') {
      throw new Error('Not ISO')
    }
    if (v !== 1) {
      throw new Error('Unsupported version')
    }
    return t
  }

  private readDir = (start: number, total: number, path: string) => {
    let n = 0
    while (n < total) {
      const base = start * SECTOR_SIZE + n
      this.reader.seek(base)
      const recLen = this.reader.readUint8()
      if (recLen < 1) {
        n = ((n / SECTOR_SIZE + 1) | 0) * SECTOR_SIZE
        continue
      }
      this.reader.readUint8()
      const loc = this.reader.readUint32()
      this.reader.skip(4)
      const len = this.reader.readUint32()
      this.reader.skip(11)
      const flags = this.reader.readUint8()
      this.reader.skip(6)
      const nameLen = this.reader.readUint8()
      const nameBytes = this.reader.readBytes(nameLen)
      n += recLen
      if (nameBytes.length === 1 && (nameBytes[0] === 0 || nameBytes[0] === 1)) {
        continue
      }
      let name = this.variant === ISOVariant.ISO9660 ? asciiDecoder.decode(nameBytes) : utf16beDecoder.decode(nameBytes)
      if (name.endsWith(';1')) {
        name = name.slice(0, -2)
      }
      const full = path + name
      this.entries.set(full, { loc, len })
      if ((flags & 0b10) !== 0) {
        this.readDir(loc, len, `${path}${name}/`)
      }
    }
  }

  open = (p: string): ArrayBuffer => {
    const e = this.entries.get(p)
    if (!e) {
      throw new Error('File not found')
    }
    const start = e.loc * SECTOR_SIZE
    return this.buffer.slice(start, start + e.len)
  }

  filelist = () => Array.from(this.entries.keys())
}
