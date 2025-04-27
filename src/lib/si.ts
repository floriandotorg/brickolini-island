import { BinaryReader } from './binary-reader'

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
		const pos = this.reader.position
		const magic = String.fromCharCode(...this.reader.readBytes(4))
		const size = this.reader.readUint32()
		const end = pos + 8 + size
		let current: SIObject | undefined
		if (magic === 'RIFF') {
			if (String.fromCharCode(...this.reader.readBytes(4)) !== 'OMNI') {
				throw new Error('Invalid SI file')
			}
		} else if (magic === 'MxHd') {
			this.version = this.reader.readUint32() as SIVersion
			this.bufferSize = this.reader.readUint32()
			this.reader.skip(4)
		} else if (magic === 'pad ') {
			this.reader.skip(size)
		} else if (magic === 'MxOf') {
			this.reader.skip(4)
			const realCount = size / 4 - 1
			this.reader.skip(realCount * 4)
		} else if (magic === 'LIST') {
			if (String.fromCharCode(...this.reader.readBytes(4)) === 'MxCh') {
				if (this.version === SIVersion.Version2_1) {
					throw new Error('Version 2.1 not supported')
				}
				const listVar = String.fromCharCode(...this.reader.readBytes(4))
				if (listVar === 'Act\u0000' || listVar === 'RAND') {
					if (listVar === 'RAND') {
						this.reader.skip(5)
					}
					this.reader.skip(2 * this.reader.readUint32())
				}
			}
		} else if (magic === 'MxSt' || magic === 'MxDa' || magic === 'WAVE' || magic === 'fmt_' || magic === 'data' || magic === 'OMNI') {
			// pass
		} else if (magic === 'MxOb') {
			const type = this.reader.readUint16() as SIType
			const presenter = this.reader.readString()
			this.reader.skip(4)
			const name = this.reader.readString()
			const id = this.reader.readUint32()
			const flags = this.reader.readUint32()
			this.reader.skip(4)
			const duration = this.reader.readUint32()
			const loops = this.reader.readUint32()
			const coords: number[] = []
			for (let i = 0; i < 9; i++) {
				coords.push(this.reader.readFloat64())
			}
			const extraSkip = this.reader.readUint16()
			if (extraSkip) {
				this.reader.skip(extraSkip)
			}
			let filename: string | undefined
			let fileType: SIFileType | undefined
			let volume: number | undefined
			if (type !== SIType.Presenter && type !== SIType.World && type !== SIType.Animation) {
				filename = this.reader.readString()
				this.reader.skip(12)
				fileType = this.reader.readUint32() as SIFileType
				this.reader.skip(8)
				if (fileType === SIFileType.WAV) {
					volume = this.reader.readUint32()
				}
			}
			const [coord0, coord1, coord2, coord3, coord4, coord5, coord6, coord7, coord8] = coords
			if (coord0 == null || coord1 == null || coord2 == null || coord3 == null || coord4 == null || coord5 == null || coord6 == null || coord7 == null || coord8 == null) {
				throw new Error('Invalid coordinates')
			}
			const obj = new SIObject(type, presenter, name, id, flags, duration, loops, [coord0, coord1, coord2], [coord3, coord4, coord5], [coord6, coord7, coord8], filename, fileType, volume)
			this.objectList.set(id, obj)
			const parent = parents.at(-1)
			if (parent) {
				parent.children.push(obj)
			}
			current = obj
		} else if (magic === 'MxCh') {
			const flags = this.reader.readUint16()
			const id = this.reader.readUint16()
			this.reader.skip(4)
			const totalSize = this.reader.readUint32()
			const chunkSize = size - 14
			const data = this.reader.readBytes(chunkSize)
			if ((flags & SIChunkFlags.End) === 0) {
				const obj = this.objectList.get(id)
				if (obj) {
					const combined = new Uint8Array(obj.data.length + data.length)
					combined.set(obj.data)
					combined.set(data, obj.data.length)
					obj.data = combined
					if (this.splitChunkBytesWritten === 0) {
						obj.chunkSizes.push(totalSize)
					}
					if ((flags & SIChunkFlags.Split) !== 0) {
						this.splitChunkBytesWritten += chunkSize
						if (this.splitChunkBytesWritten >= totalSize) {
							this.splitChunkBytesWritten = 0
						}
					}
				}
			}
		} else {
			throw new Error(`Unknown chunk ${magic} at ${pos.toString(16)}`)
		}
		while (this.reader.position + 8 < end) {
			if (this.bufferSize > 0) {
				const offset = this.reader.position % this.bufferSize
				if (offset + 8 > this.bufferSize) {
					this.reader.skip(this.bufferSize - offset)
				}
			}
			this.readChunk(current ? [...parents, current] : parents)
		}
		this.reader.seek(end)
		if (size % 2 === 1) {
			this.reader.skip(1)
		}
	}
}
