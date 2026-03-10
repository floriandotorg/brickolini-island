import * as THREE from 'three'
import type { AudioAction, PositionalAudioAction } from '../action-types'
import { getActionFileUrl, manager } from './load'

const audioLoader = new THREE.AudioLoader(manager)

export class Audio {
  private readonly _action: AudioAction
  private readonly _audio: THREE.Audio<GainNode>

  public constructor(action: AudioAction, audio: THREE.Audio<GainNode>, gains: GainNode[] = []) {
    this._action = action
    this._audio = audio
    this._audio.gain.gain.value = action.volume / 100
    this._audio.setLoop(action.loops > 1)
    this._audio.onEnded = () => this.onEnded()

    if (gains.length > 0) {
      this._audio.gain.disconnect()
      this._audio.gain.connect(gains[0])
      for (let n = 1; n < gains.length; ++n) {
        gains[n - 1].connect(gains[n])
      }
      gains[gains.length - 1].connect(audio.listener.getInput())
    }
  }

  public get gain(): AudioParam {
    return this._audio.gain.gain
  }

  public get loop(): boolean {
    return this._audio.loop
  }

  public set loop(looping: boolean) {
    this._audio.setLoop(looping)
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

export const getAudio = async (listener: THREE.AudioListener, action: AudioAction, gains: GainNode[]): Promise<Audio> => {
  const audio = new THREE.Audio(listener)
  audio.setBuffer(await audioLoader.loadAsync(getActionFileUrl(action)))
  return new Audio(action, audio, gains)
}

export const getPositionalAudio = async (listener: THREE.AudioListener, action: PositionalAudioAction): Promise<THREE.PositionalAudio> => {
  const audio = new THREE.PositionalAudio(listener)
  audio.setBuffer(await audioLoader.loadAsync(getActionFileUrl(action)))
  audio.gain.gain.value = action.volume / 100
  audio.setRefDistance(10)
  audio.setRolloffFactor(1.25)
  audio.setMaxDistance(100)
  return audio
}
