import { getMovie } from './assets'
import { BinaryReader } from './binary-reader'
import BinaryWriter from './binary-writer'
import { Smk } from './smk'
import { setMode } from './store'
import type { SIObject } from './si'

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

export const playCutscene = async (name: string) => {
  setMode('cutscene')

  const { audio, video } = getMovie(name)
  const canvas = document.getElementById('cutscene-canvas') as HTMLCanvasElement
  if (canvas == null) {
    throw new Error('Canvas element not found')
  }
  const ctx = canvas.getContext('2d')
  if (ctx == null) {
    throw new Error('Canvas context not found')
  }
  const smk = new Smk(new BinaryReader(video.data.buffer))

  const audioCtx = new AudioContext()
  const audioSource = audioCtx.createBufferSource()
  audioSource.buffer = await audioCtx.decodeAudioData(toWAV(audio))
  audioSource.connect(audioCtx.destination)
  audioSource.start()

  const decodeFrame = () => {
    const frame = smk.decodeFrame()

    canvas.width = smk.width
    canvas.height = smk.height
    const imageData = ctx.createImageData(smk.width, smk.height)
    for (let n = 0; n < smk.width * smk.height; ++n) {
      const i = n * 3
      const j = n * 4
      imageData.data[j] = frame[i]
      imageData.data[j + 1] = frame[i + 1]
      imageData.data[j + 2] = frame[i + 2]
      imageData.data[j + 3] = 255
    }
    return imageData
  }
  let n = 0
  let currentFrame = decodeFrame()
  return new Promise<void>(resolve => {
    const render = () => {
      if (n * (1000 / smk.frameRate) < audioCtx.currentTime * 1000) {
        if (n >= smk.numFrames - 1) {
          resolve()
          return
        }

        currentFrame = decodeFrame()
        ++n
      }

      ctx.putImageData(currentFrame, 0, 0)

      requestAnimationFrame(render)
    }
    render()
  })
}
