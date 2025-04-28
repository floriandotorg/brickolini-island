import { type SIObject, SIType, SI } from './si'
import { ISO9660, ISOVariant } from './iso'
import { BinaryWriter } from './binary-writer'
import { Smk } from './smk'
import { BinaryReader } from './binary-reader'
import { WDB } from './wdb'
import { setLoading } from './store'

const siFiles: Map<string, SI> = new Map()
let wdb: WDB | null = null

export const initAssets = async (file: File) => {
  const updateLoading = async (progress: number, message: string) => {
    setLoading({ progress, message })
    // hack to update the UI, todo move loading to web worker
    await new Promise(resolve => setTimeout(resolve))
  }

  await updateLoading(0, 'Loading ISO...')

  const iso = new ISO9660(await file.arrayBuffer(), ISOVariant.Joliet)

  const filenames = [
    'Lego/Scripts/INTRO.SI',
    'Lego/Scripts/Build/COPTER.SI',
    'Lego/Scripts/Build/DUNECAR.SI',
    'Lego/Scripts/Build/JETSKI.SI',
    'Lego/Scripts/Build/RACECAR.SI',
    'Lego/Scripts/Race/CARRACE.SI',
    'Lego/Scripts/Race/CARRACER.SI',
    'Lego/Scripts/Race/JETRACE.SI',
    'Lego/Scripts/Race/JETRACER.SI',
    'Lego/Scripts/Isle/ISLE.SI',
    'Lego/Scripts/Infocntr/ELEVBOTT.SI',
    'Lego/Scripts/Infocntr/INFODOOR.SI',
    'Lego/Scripts/Infocntr/INFOMAIN.SI',
    'Lego/Scripts/Infocntr/INFOSCOR.SI',
    'Lego/Scripts/Infocntr/REGBOOK.SI',
    'Lego/Scripts/Infocntr/HISTBOOK.SI',
    'Lego/Scripts/Hospital/HOSPITAL.SI',
    'Lego/Scripts/Police/POLICE.SI',
    'Lego/Scripts/Garage/GARAGE.SI',
    'Lego/Scripts/Act2/ACT2MAIN.SI',
    'Lego/Scripts/Act3/ACT3.SI',
    'Lego/Scripts/Isle/JUKEBOX.SI',
    'Lego/Scripts/Isle/JUKEBOXW.SI',
    'Lego/Scripts/SNDANIM.SI',
    'Lego/Scripts/CREDITS.SI',
  ]
  for (let n = 0; n < filenames.length; n++) {
    const filename = filenames[n].split('/').pop()
    if (filename == null) {
      throw new Error('Filename not found')
    }
    await updateLoading(5 + (n / filenames.length) * 90, `Loading ${filename}...`)
    siFiles.set(filename, new SI(iso.open(filenames[n])))
  }

  await updateLoading(95, 'Loading WDB...')
  wdb = new WDB(iso.open('DATA/disk/LEGO/data/WORLD.WDB'))

  setLoading(null)
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
  const si = siFiles.get('INTRO.SI')
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
