import { BinaryReader } from './binary-reader'

const SECTOR_SIZE = 2048

export enum IsoVariant {
	ISO9660 = 1,
	Joliet = 2,
}

interface IsoFileEntry {
	loc: number
	len: number
}

export class IsoReader {
	private mainReader: BinaryReader
	private variant: IsoVariant
	private pathToLoc = new Map<string, IsoFileEntry>()
	private view: DataView

	constructor(buffer: ArrayBuffer, variant: IsoVariant = IsoVariant.Joliet) {
		this.mainReader = new BinaryReader(buffer)
		this.view = new DataView(buffer)
		this.variant = variant

		let volumeDescriptorSector: number
		if (variant === IsoVariant.ISO9660) {
			if (this.getVolumeDescriptorType(16) !== 1) {
				throw new Error('Primary volume descriptor must be type 1 for ISO9660')
			}
			volumeDescriptorSector = 16
		} else if (variant === IsoVariant.Joliet) {
			if (this.getVolumeDescriptorType(17) !== 2) {
				throw new Error('Volume descriptor at sector 17 must be type 2 for Joliet')
			}
			volumeDescriptorSector = 17
		} else {
			throw new Error('Unsupported variant')
		}

		this.mainReader.seek(volumeDescriptorSector * SECTOR_SIZE + 156)

		const rootDirRecordBytes = this.mainReader.readBytes(34)
		const rootDirRecordBuffer = rootDirRecordBytes.buffer.slice(rootDirRecordBytes.byteOffset, rootDirRecordBytes.byteOffset + rootDirRecordBytes.byteLength)
		const rootReader = new BinaryReader(rootDirRecordBuffer as ArrayBuffer)
		rootReader.skip(2)
		const rootDirLoc = rootReader.readUint32()
		rootReader.skip(4)
		const rootDirLen = rootReader.readUint32()

		this.readDir(rootDirLoc, rootDirLen, '')
	}

	private getVolumeDescriptorType(sector: number): number | null {
		this.mainReader.seek(sector * SECTOR_SIZE)
		const type = this.mainReader.readInt8()
		const identifier = this.mainReader.readBytes(5)
		const version = this.mainReader.readInt8()

		const decoder = new TextDecoder('ascii')
		if (decoder.decode(identifier) !== 'CD001' || version !== 1) {
			throw new Error('Not a valid ISO 9660 file')
		}
		return type
	}

	private readDir(start: number, totalLen: number, currentPath: string): void {
		let n = 0
		const decoder = new TextDecoder(this.variant === IsoVariant.Joliet ? 'utf-16be' : 'ascii')

		while (n < totalLen) {
			const sectorStartOffset = start * SECTOR_SIZE
			if (sectorStartOffset + n >= this.mainReader.length) break

			this.mainReader.seek(sectorStartOffset + n)
			const recordStartReaderOffset = this.mainReader.position

			if (recordStartReaderOffset + 1 > this.mainReader.length) break
			const recLen = this.mainReader.readInt8()

			if (recLen <= 0) {
				const bytesRemainingInSector = SECTOR_SIZE - (n % SECTOR_SIZE)
				n += bytesRemainingInSector
				if (bytesRemainingInSector === 0) n += SECTOR_SIZE
				continue
			}

			if (recordStartReaderOffset + recLen > this.mainReader.length) {
				break
			}

			this.mainReader.seek(recordStartReaderOffset + 1)

			if (this.mainReader.position + 28 > this.mainReader.length) {
				break
			}

			this.mainReader.skip(1)
			const loc = this.mainReader.readUint32()
			this.mainReader.skip(4)
			const len = this.mainReader.readUint32()
			this.mainReader.skip(7)
			const flags = this.mainReader.readInt8()
			this.mainReader.skip(6)
			this.mainReader.skip(4)
			const nameLen = this.mainReader.readInt8()

			if (this.mainReader.position + nameLen > this.mainReader.length || this.mainReader.position + nameLen > recordStartReaderOffset + recLen) {
				break
			}

			const nameBytes = this.mainReader.readBytes(nameLen)
			n += recLen

			if (nameBytes.length === 1 && (nameBytes[0] === 0 || nameBytes[0] === 1)) {
				continue
			}

			let name = decoder.decode(nameBytes)

			if (this.variant === IsoVariant.Joliet && name.endsWith('\u0000')) {
				name = name.slice(0, -1)
			}

			if (this.variant === IsoVariant.ISO9660 && name.includes(';')) {
				const parts = name.split(';')
				if (parts.length === 2 && parts[1] && /^\d+$/.test(parts[1]) && parts[0]) {
					name = parts[0]
				}
			}

			const safeCurrentPath = currentPath ?? ''
			const filename = `${safeCurrentPath}${name}`

			if (!(flags & 0b10)) {
				this.pathToLoc.set(filename, { loc, len })
			}

			if (flags & 0b10 && nameBytes[0] !== 0 && nameBytes[0] !== 1) {
				this.readDir(loc, len, `${filename}/`)
			}
		}
	}

	open(path: string): ArrayBuffer {
		const entry = this.pathToLoc.get(path)
		if (!entry) {
			throw new Error(`File not found: ${path}`)
		}
		const bufferSlice = this.view.buffer.slice(entry.loc * SECTOR_SIZE, entry.loc * SECTOR_SIZE + entry.len)

		if (bufferSlice instanceof ArrayBuffer) {
			return bufferSlice
		}

		const standardBuffer = new ArrayBuffer(bufferSlice.byteLength)
		new Uint8Array(standardBuffer).set(new Uint8Array(bufferSlice))
		return standardBuffer
	}

	get filelist(): string[] {
		return Array.from(this.pathToLoc.keys())
	}
}
