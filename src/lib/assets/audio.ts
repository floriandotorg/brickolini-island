import * as THREE from 'three'
import type { AudioAction, PositionalAudioAction } from '../action-types'
import { getActionFileUrl, manager } from './load'

const audioLoader = new THREE.AudioLoader(manager)

export class Audio {
  private readonly _action: AudioAction
  private readonly _audio: THREE.Audio<GainNode>

  public constructor(action: AudioAction, audio: THREE.Audio<GainNode>) {
    this._action = action
    this._audio = audio
    this._audio.gain.gain.value = action.volume / 100
    this._audio.loop = action.loops > 1
    this._audio.onEnded = () => this.onEnded()
  }

  public get gain(): AudioParam {
    return this._audio.gain.gain
  }

  public get loop(): boolean {
    return this._audio.loop
  }

  public set loop(looping: boolean) {
    this._audio.loop = looping
  }

  public play(): void {
    this._audio.play(this._action.startTime / 1000)
  }

  public playAgain(): void {
    this.stop()
    this.play()
  }

  public stop(delay?: number): void {
    this._audio.stop(delay)
  }

  public pause(): void {
    this._audio.pause()
  }

  public onEnded: () => void = () => {}
}

export const getAudio = async (listener: THREE.AudioListener, action: AudioAction, gain: GainNode): Promise<Audio> => {
  const audio = new THREE.Audio(listener)
  audio.setBuffer(await audioLoader.loadAsync(getActionFileUrl(action)))
  audio.setFilter(gain)
  return new Audio(action, audio)
}

export const getPositionalAudio = async (listener: THREE.AudioListener, action: PositionalAudioAction): Promise<THREE.PositionalAudio> => {
  const audio = new THREE.PositionalAudio(listener)
  audio.setBuffer(await audioLoader.loadAsync(getActionFileUrl(action)))
  audio.gain.gain.value = action.volume / 100
  return audio
}
