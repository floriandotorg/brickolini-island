import type * as THREE from 'three'
import type { PositionalAudioAction } from '../action-types'
import { getPositionalAudio, loadAudioBuffer, type SpatialAudio } from '../assets/audio'

export class SoundCache {
  private readonly _actions = new Map<string, PositionalAudioAction>()
  private readonly _handles = new Set<SpatialAudio>()
  private readonly _listener: THREE.AudioListener
  private readonly _gain: GainNode
  private _generation = 0

  public constructor(listener: THREE.AudioListener, gain: GainNode) {
    this._listener = listener
    this._gain = gain
  }

  public async register(action: PositionalAudioAction): Promise<void> {
    const key = (action.filename.split(/[\\/]/).pop() ?? '').replace(/\.[^.]+$/, '').toLowerCase()
    if (!this._actions.has(key)) {
      this._actions.set(key, action)
    }
    await loadAudioBuffer(action)
  }

  public async play(key: string, attachTo: THREE.Object3D | null, loop = false, delay = 0): Promise<SpatialAudio> {
    const action = this._actions.get(key.toLowerCase())
    if (action == null) {
      throw new Error(`Cached sound not found: ${key}`)
    }
    const generation = this._generation
    const audio = await getPositionalAudio(this._listener, action, [this._gain])
    if (generation !== this._generation) {
      return audio
    }
    audio.positional = attachTo != null
    attachTo?.add(audio)
    audio.setLoop(loop)
    this._handles.add(audio)
    const onEnded = audio.onEnded.bind(audio)
    audio.onEnded = () => {
      onEnded()
      this.destroy(audio)
    }
    audio.play(delay)
    return audio
  }

  public stop(handle: SpatialAudio): void {
    if (handle.isPlaying) {
      handle.stop()
    }
  }

  public destroy(handle: SpatialAudio): void {
    this.stop(handle)
    handle.removeFromParent()
    handle.gain.disconnect()
    this._handles.delete(handle)
  }

  public muteSilence(handle: SpatialAudio, muted: boolean): void {
    handle.silence = muted
  }

  public update(cameraPosition: THREE.Vector3, sound3d: boolean): void {
    for (const handle of this._handles) {
      handle.updateSpatial(cameraPosition, sound3d)
    }
  }

  public deactivate(): void {
    ++this._generation
    for (const handle of this._handles) {
      this.destroy(handle)
    }
  }

  public dispose(): void {
    this.deactivate()
    this._actions.clear()
  }
}
