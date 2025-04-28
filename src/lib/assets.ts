import { type SIObject, SIType, SI } from './si'
import { ISO9660, ISOVariant } from './iso'
import { BinaryWriter } from './binary-writer'
import { Smk } from './smk'
import { BinaryReader } from './binary-reader'
import { WDB } from './wdb'
let si: SI | null = null
let wdb: WDB | null = null

export const initAssets = async (file: File) => {
  const iso = new ISO9660(await file.arrayBuffer(), ISOVariant.Joliet)
  si = new SI(iso.open('Lego/Scripts/INTRO.SI'))

  wdb = new WDB(iso.open("DATA/disk/LEGO/data/WORLD.WDB"))
}

const createWAV = (obj: SIObject): ArrayBuffer => {
  const writeChunk = (writer: BinaryWriter, tag: string, data: Uint8Array) => {
    writer.writeString(tag)
    writer.writeU32(data.length)
    writer.writeBytes(data)
    if (data.length % 2 === 1) {
      writer.writeU8(0)
    }
  }

  const firstChunkSize = obj.chunkSizes[0]
  if (!firstChunkSize) {
    throw new Error('First chunk size not found')
  }

  const contentWriter = new BinaryWriter()
  contentWriter.writeString('WAVE')
  writeChunk(contentWriter, 'fmt ', obj.data.subarray(0, firstChunkSize))
  writeChunk(contentWriter, 'data', obj.data.subarray(firstChunkSize))
  const fileWriter = new BinaryWriter()
  writeChunk(fileWriter, 'RIFF', new Uint8Array(contentWriter.buffer))
  return fileWriter.buffer
}

export const getMovie = (name: string): { audio: ArrayBuffer; video: Smk } => {
  if (si == null) {
    throw new Error('Assets not initialized')
  }

  const movie = Array.from(si.objects.values()).find(o => o.name === name)
  if (movie == null) {
    throw new Error('Movie not found')
  }

  const audio = movie.children.find(c => c.type === SIType.Sound)
  if (audio == null) {
    throw new Error('Audio not found')
  }

  const video = movie.children.find(c => c.type === SIType.Video)
  if (video == null) {
    throw new Error('Video not found')
  }

  return { audio: createWAV(audio), video: new Smk(new BinaryReader(video.data.buffer)) }
}
