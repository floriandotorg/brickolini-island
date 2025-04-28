import { type SIObject, SIType, SI } from './si'
import { ISO9660, ISOVariant } from './iso'

let si: SI | null = null

export const initAssets = async (file: File) => {
  const iso = new ISO9660(await file.arrayBuffer(), ISOVariant.Joliet)
  si = new SI(iso.open('Lego/Scripts/INTRO.SI'))
}

export const getMovie = (name: string): { audio: SIObject; video: SIObject } => {
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

  return { audio, video }
}
