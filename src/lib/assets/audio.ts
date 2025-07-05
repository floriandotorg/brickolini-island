import * as THREE from 'three'
import type { AudioAction, PositionalAudioAction } from '../action-types'
import { getActionFileUrl, manager } from './load'

const audioLoader = new THREE.AudioLoader(manager)

export const getAudio = async (listener: THREE.AudioListener, action: AudioAction): Promise<THREE.Audio> => {
  const audio = new THREE.Audio(listener)
  audio.setBuffer(await audioLoader.loadAsync(getActionFileUrl(action)))
  audio.setVolume(action.volume / 100)
  return audio
}

export const getPositionalAudio = async (listener: THREE.AudioListener, action: PositionalAudioAction): Promise<THREE.PositionalAudio> => {
  const audio = new THREE.PositionalAudio(listener)
  audio.setBuffer(await audioLoader.loadAsync(getActionFileUrl(action)))
  audio.setVolume(action.volume / 100)
  return audio
}
