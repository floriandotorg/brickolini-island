import * as THREE from 'three'
import type { Action } from '../../actions/types'
import { engine } from '../engine'
import { getActionFileUrl, manager } from './load'

const audioLoader = new THREE.AudioLoader(manager)

export type AudioAction = { id: number; siFile: string; fileType: Action.FileType.WAV; volume: number }

export const getAudio = async (action: AudioAction): Promise<THREE.Audio> => {
  const audio = new THREE.Audio(engine.audioListener)
  audio.setBuffer(await audioLoader.loadAsync(getActionFileUrl(action)))
  audio.setVolume(action.volume / 100)
  return audio
}

export const getPositionalAudio = async (action: AudioAction): Promise<THREE.PositionalAudio> => {
  const audio = new THREE.PositionalAudio(engine.audioListener)
  audio.setBuffer(await audioLoader.loadAsync(getActionFileUrl(action)))
  audio.setVolume(action.volume / 100)
  audio.setRefDistance(20)
  return audio
}
