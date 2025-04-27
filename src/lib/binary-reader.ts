export class BinaryReader {
	private view: DataView
	private offset = 0

	constructor(buffer: ArrayBuffer) {
		this.view = new DataView(buffer)
	}

	get position(): number {
		return this.offset
	}

	get length(): number {
		return this.view.byteLength
	}

	readUint32() {
		const value = this.view.getUint32(this.offset, true)
		this.offset += 4
		return value
	}

	readInt8() {
		const value = this.view.getInt8(this.offset)
		this.offset += 1
		return value
	}

	readFloat32() {
		const value = this.view.getFloat32(this.offset, true)
		this.offset += 4
		return value
	}

	readBytes(count: number): Uint8Array {
		if (this.offset + count > this.view.byteLength) {
			throw new Error('Reading beyond buffer length')
		}
		const value = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, count)
		this.offset += count
		return value
	}

	seek(offset: number) {
		if (offset < 0 || offset > this.view.byteLength) {
			throw new Error('Seeking beyond buffer bounds')
		}
		this.offset = offset
	}

	skip(count: number) {
		this.seek(this.offset + count)
	}
}
