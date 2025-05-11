const decoder = new TextDecoder('ascii')

export class BinaryReader {
  private _view: DataView
  private _offset = 0

  constructor(buffer: ArrayBuffer) {
    this._view = new DataView(buffer)
  }

  get position(): number {
    return this._offset
  }

  get length(): number {
    return this._view.byteLength
  }

  readUint32(): number {
    const value = this._view.getUint32(this._offset, true)
    this._offset += 4
    return value
  }

  readUint16(): number {
    const value = this._view.getUint16(this._offset, true)
    this._offset += 2
    return value
  }

  readUint8(): number {
    const value = this._view.getUint8(this._offset)
    this._offset += 1
    return value
  }

  readInt8(): number {
    const value = this._view.getInt8(this._offset)
    this._offset += 1
    return value
  }

  readInt32(): number {
    const value = this._view.getInt32(this._offset, true)
    this._offset += 4
    return value
  }

  readFloat32(): number {
    const value = this._view.getFloat32(this._offset, true)
    this._offset += 4
    return value
  }

  readFloat64(): number {
    const value = this._view.getFloat64(this._offset, true)
    this._offset += 8
    return value
  }

  readBytes(count: number): Uint8Array {
    if (this._offset + count > this._view.byteLength) {
      throw new Error('Reading beyond buffer length')
    }
    const value = new Uint8Array(this._view.buffer, this._view.byteOffset + this._offset, count)
    this._offset += count
    return value
  }

  readNullTerminatedString(): string {
    const result: number[] = []
    while (true) {
      const char = this.readUint8()
      if (char === 0) {
        break
      }
      result.push(char)
    }
    return decoder.decode(new Uint8Array(result))
  }

  readString(lengthType: 'u8' | 'u16' | 'u32' = 'u32'): string {
    const len = lengthType === 'u8' ? this.readUint8() : lengthType === 'u16' ? this.readUint16() : this.readUint32()
    const bytes = this.readBytes(len)
    let end = bytes.length
    while (end > 0 && bytes[end - 1] === 0) {
      end -= 1
    }
    return decoder.decode(bytes.subarray(0, end))
  }

  readVector3(): [number, number, number] {
    return [-this.readFloat32(), this.readFloat32(), this.readFloat32()]
  }

  readVector4(): [number, number, number, number] {
    return [this.readFloat32(), this.readFloat32(), this.readFloat32(), this.readFloat32()]
  }

  seek(offset: number): void {
    if (offset < 0 || offset > this._view.byteLength) {
      throw new Error('Seeking beyond buffer bounds')
    }
    this._offset = offset
  }

  skip(count: number): void {
    this.seek(this._offset + count)
  }
}
