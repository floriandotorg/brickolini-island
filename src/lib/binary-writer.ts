const encoder = new TextEncoder()

export class BinaryWriter {
  private _buffer: ArrayBuffer
  private _view: DataView
  private _offset: number

  constructor(initialSize = 1024) {
    this._buffer = new ArrayBuffer(initialSize)
    this._view = new DataView(this._buffer)
    this._offset = 0
  }

  private ensureCapacity = (additionalBytes: number) => {
    if (this._offset + additionalBytes > this._buffer.byteLength) {
      const newBuffer = new ArrayBuffer(Math.max(this._buffer.byteLength * 2, this._offset + additionalBytes))
      new Uint8Array(newBuffer).set(new Uint8Array(this._buffer))
      this._buffer = newBuffer
      this._view = new DataView(this._buffer)
    }
  }

  writeU8 = (value: number) => {
    this.ensureCapacity(1)
    this._view.setUint8(this._offset, value)
    this._offset += 1
  }

  writeU16 = (value: number) => {
    this.ensureCapacity(2)
    this._view.setUint16(this._offset, value, true)
    this._offset += 2
  }

  writeU32 = (value: number) => {
    this.ensureCapacity(4)
    this._view.setUint32(this._offset, value, true)
    this._offset += 4
  }

  writeString = (str: string) => {
    const encoded = encoder.encode(str)
    this.writeBytes(encoded)
  }

  writeBytes = (bytes: Uint8Array) => {
    this.ensureCapacity(bytes.length)
    new Uint8Array(this._buffer, this._offset).set(bytes)
    this._offset += bytes.length
  }

  get buffer() {
    return this._buffer.slice(0, this._offset)
  }

  get size() {
    return this._offset
  }

  clear() {
    this._offset = 0
  }
}

export default BinaryWriter
