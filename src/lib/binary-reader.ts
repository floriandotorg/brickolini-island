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

  readUint32() {
    const value = this._view.getUint32(this._offset, true)
    this._offset += 4
    return value
  }

  readUint16() {
    const value = this._view.getUint16(this._offset, true)
    this._offset += 2
    return value
  }

  readUint8() {
    const value = this._view.getUint8(this._offset)
    this._offset += 1
    return value
  }

  readInt8() {
    const value = this._view.getInt8(this._offset)
    this._offset += 1
    return value
  }

  readInt32() {
    const value = this._view.getInt32(this._offset, true)
    this._offset += 4
    return value
  }

  readFloat32() {
    const value = this._view.getFloat32(this._offset, true)
    this._offset += 4
    return value
  }

  readFloat64() {
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

  readString() {
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

  seek(offset: number) {
    if (offset < 0 || offset > this._view.byteLength) {
      throw new Error('Seeking beyond buffer bounds')
    }
    this._offset = offset
  }

  skip(count: number) {
    this.seek(this._offset + count)
  }
}
