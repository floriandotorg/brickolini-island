import './style.css'
import { ISO9660, ISOVariant } from './lib/iso'
import { SI, type SIObject, SIType } from './lib/si'
import { BinaryWriter } from './lib/binary-writer'

const dropZone = document.getElementById('drop-zone')
const isoInput = document.getElementById('iso-input') as HTMLInputElement | null
const dropZoneLabel = dropZone?.querySelector('label[for="iso-input"]')

if (!dropZone || !isoInput || !dropZoneLabel) {
  throw new Error('Elements not found')
}

const toWAV = (obj: SIObject): ArrayBuffer => {
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

const readIso = async (file: File) => {
  const reader = new ISO9660(await file.arrayBuffer(), ISOVariant.Joliet)
  console.log(reader.filelist())
  const si = new SI(reader.open('Lego/Scripts/INTRO.SI'))
  console.log(si.objects)
  const movie = Array.from(si.objects.values()).find(o => o.name === 'Lego_Movie')
  if (!movie) {
    throw new Error('Movie not found')
  }
  const audio = movie.children.find(c => c.type === SIType.Sound)
  if (!audio) {
    throw new Error('Audio not found')
  }
  const audioCtx = new AudioContext()
  const audioSource = audioCtx.createBufferSource()
  audioSource.buffer = await audioCtx.decodeAudioData(toWAV(audio))
  audioSource.connect(audioCtx.destination)
  audioSource.start()
}

const handleFileSelect = async (file: File | null) => {
  if (!file) {
    throw new Error('No file selected.')
  }

  if (!file.name.toLowerCase().endsWith('.iso')) {
    throw new Error('Invalid file type. Please select an ISO file.')
  }

  readIso(file)
}

for (const eventName of ['dragenter', 'dragover', 'dragleave', 'drop']) {
  dropZone.addEventListener(
    eventName,
    e => {
      e.preventDefault()
      e.stopPropagation()
    },
    false,
  )
}

for (const eventName of ['dragenter', 'dragover']) {
  dropZone.addEventListener(
    eventName,
    () => {
      dropZone.classList.add('highlight')
    },
    false,
  )
}

for (const eventName of ['dragleave', 'drop']) {
  dropZone.addEventListener(
    eventName,
    () => {
      dropZone.classList.remove('highlight')
    },
    false,
  )
}

dropZone.addEventListener(
  'drop',
  e => {
    const dt = e.dataTransfer
    const files = dt?.files

    if (files && files.length > 0) {
      handleFileSelect(files[0] ?? null)
    }
  },
  false,
)

isoInput.addEventListener('change', e => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    handleFileSelect(target.files[0] ?? null)
  }
})

dropZone.addEventListener('click', e => {
  if (e.target !== dropZoneLabel && e.target !== isoInput) {
    isoInput.click()
  }
})

if (import.meta.env.DEV) {
  const res = await fetch('/LEGO_ISLANDI.ISO')
  if (!res.ok) {
    throw new Error(`Failed to fetch ISO: ${res.status}`)
  }
  const blob = await res.blob()
  const file = new File([blob], 'your.iso', { type: 'application/octet-stream' })
  readIso(file)
}
