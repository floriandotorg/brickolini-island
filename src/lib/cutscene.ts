import { getMovie } from './assets'
import { setMode } from './store'

let skipCutscene = false
window.skipCutscene = () => {
  skipCutscene = true
}

export const playCutscene = async (name: string) => {
  setMode('cutscene')
  skipCutscene = false

  const { audio, video } = getMovie(name)

  const canvas = document.getElementById('cutscene-canvas') as HTMLCanvasElement
  if (canvas == null) {
    throw new Error('Canvas element not found')
  }

  const ctx = canvas.getContext('2d')
  if (ctx == null) {
    throw new Error('Canvas context not found')
  }

  const audioCtx = new AudioContext()
  const audioSource = audioCtx.createBufferSource()
  audioSource.buffer = await audioCtx.decodeAudioData(audio)
  audioSource.connect(audioCtx.destination)
  audioSource.start()

  const decodeFrame = () => {
    const frame = video.decodeFrame()

    canvas.width = video.width
    canvas.height = video.height
    const imageData = ctx.createImageData(video.width, video.height)
    for (let n = 0; n < video.width * video.height; ++n) {
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
      if (skipCutscene) {
        resolve()
        return
      }

      if (n * (1000 / video.frameRate) < audioCtx.currentTime * 1000) {
        if (n >= video.numFrames - 1) {
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
