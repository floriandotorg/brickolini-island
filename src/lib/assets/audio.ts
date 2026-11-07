import * as THREE from 'three'
import type { AudioAction, PositionalAudioAction } from '../action-types'
import { distanceVolume, volumeToGain } from '../audio/volume.ts'
import { getActionFileUrl, manager } from './load'

const audioLoader = new THREE.AudioLoader(manager)

export class Audio {
  private readonly _action: AudioAction
  private readonly _audio: THREE.Audio<GainNode>
  private _ended = false

  public constructor(action: AudioAction, audio: THREE.Audio<GainNode>, gains: GainNode[] = []) {
    this._action = action
    this._audio = audio
    this._audio.gain.gain.value = volumeToGain(action.volume)
    this._audio.setLoop(action.loops > 1)
    this._audio.onEnded = () => {
      this.onEnded()
      this._ended = true
    }

    if (gains.length > 0) {
      this._audio.gain.disconnect()
      this._audio.gain.connect(gains[0])
      for (let n = 1; n < gains.length; ++n) {
        gains[n - 1].connect(gains[n])
      }
      gains[gains.length - 1].connect(audio.listener.getInput())
    }
  }

  public get ended(): boolean {
    return this._ended
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
    this._ended = false
    if (!this._audio.isPlaying) {
      this._audio.play(this._action.startTime / 1000)
    }
  }

  public playAgain(): void {
    this.stop()
    this.play()
  }

  public stop(delay?: number): void {
    if (this._audio.isPlaying) {
      this._audio.stop(delay)
    }
  }

  public pause(): void {
    this._audio.pause()
  }

  public onEnded: () => void = () => {}
}

export class Playlist {
  private _index = 0
  public constructor(private readonly _audios: AudioAction[]) {}

  public play(): AudioAction {
    const action = this._audios[this._index]
    if (action == null) {
      throw new Error(`No audio action at index ${this._index}`)
    }
    this._index = (this._index + 1) % this._audios.length
    return action
  }
}

const buffers = new Map<string, Promise<AudioBuffer>>()

export const loadAudioBuffer = (action: AudioAction | PositionalAudioAction): Promise<AudioBuffer> => {
  const url = getActionFileUrl(action)
  const existing = buffers.get(url)
  if (existing != null) {
    return existing
  }
  const loading = audioLoader.loadAsync(url).catch(error => {
    buffers.delete(url)
    throw error
  })
  buffers.set(url, loading)
  return loading
}

export class SpatialAudio extends THREE.PositionalAudio {
  private _spatial = true
  private readonly _volume: number
  private readonly _position = new THREE.Vector3()
  public silence = false
  public positional = true

  public constructor(listener: THREE.AudioListener, volume = 79) {
    super(listener)
    this._volume = volume
  }

  public override connect(): this {
    super.connect()
    if (!this._spatial && this.source != null) {
      this.source.disconnect(this.panner)
      this.source.connect(this.gain)
    }
    return this
  }

  public override disconnect(): this {
    if (!this._spatial && this.source != null) {
      this.source.disconnect(this.gain)
      this.source.connect(this.panner)
    }
    super.disconnect()
    return this
  }

  public setPitchFactor(factor: number): void {
    if (Number.isFinite(factor) && factor > 0 && Math.abs(this.playbackRate - factor) > 0.0001) {
      this.setPlaybackRate(factor)
    }
  }

  public updateSpatial(cameraPosition: THREE.Vector3, sound3d: boolean): void {
    const spatial = sound3d && this.positional
    if (this._spatial !== spatial) {
      if (this.isPlaying) {
        this.disconnect()
        this._spatial = spatial
        this.connect()
      } else {
        this._spatial = spatial
      }
    }
    const distanceSquared = this.positional ? this.getWorldPosition(this._position).distanceToSquared(cameraPosition) : 0
    const attenuation = distanceSquared > 10000 ? 0 : spatial ? 1 : distanceVolume(distanceSquared)
    this.gain.gain.value = volumeToGain(this._volume) * attenuation * (this.silence ? 10 ** (-30 / 20) : 1)
  }
}

export const getAudio = async (listener: THREE.AudioListener, action: AudioAction, gains: GainNode[]): Promise<Audio> => {
  const audio = new THREE.Audio(listener)
  audio.setBuffer(await loadAudioBuffer(action))
  return new Audio(action, audio, gains)
}

export const getPositionalAudio = async (listener: THREE.AudioListener, action: PositionalAudioAction, gains: GainNode[] = []): Promise<SpatialAudio> => {
  const audio = new SpatialAudio(listener, action.volume)
  audio.setBuffer(await loadAudioBuffer(action))
  audio.gain.gain.value = volumeToGain(action.volume)
  audio.setDistanceModel('inverse')
  audio.setRefDistance(15)
  audio.setRolloffFactor(1)
  audio.setMaxDistance(100)
  if (gains.length > 0) {
    audio.gain.disconnect()
    audio.gain.connect(gains[0])
    for (let n = 1; n < gains.length; ++n) {
      gains[n - 1].connect(gains[n])
    }
    gains[gains.length - 1].connect(listener.getInput())
  }
  return audio
}
