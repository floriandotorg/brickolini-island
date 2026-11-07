import { volumeToGain } from './volume.ts'

type MusicAction = { id: number; volume: number }
type Sound = { onEnded?: () => void; gain: { value: number }; loop: boolean; play: () => void; stop: () => void; pause: () => void }
type Track = { actionId: number; audio: Sound; volume: number }

export class BackgroundMusic<Action extends MusicAction> {
  private _active: Track | null = null
  private _pending: Track | null = null
  private _loading = false
  private _generation = 0
  private _targetVolume = 79
  private _speed = 5
  private _suppression = 0
  private _enabled = true
  private _mode: 'idle' | 'fadeIn' | 'fadeToTarget' = 'idle'
  private _elapsed = 0
  private readonly _load: (action: Action) => Promise<Sound>
  public onChanged: (id: number | null) => void = () => {}

  public constructor(load: (action: Action) => Promise<Sound>) {
    this._load = load
  }

  public get currentActionId(): number | null {
    return this._pending?.actionId ?? this._active?.actionId ?? null
  }

  public get enabled(): boolean {
    return this._enabled
  }

  public async play(action: Action, speed = 5, options: { loop?: boolean; onEnded?: () => void } = {}): Promise<void> {
    if (!this._enabled || this._loading || this._pending != null || this._active?.actionId === action.id) {
      return
    }
    this._loading = true
    const generation = this._generation
    try {
      const audio = await this._load(action)
      if (generation !== this._generation || !this._enabled) {
        return
      }
      audio.loop = options.loop ?? true
      if (!audio.loop) {
        audio.onEnded = () => {
          if (generation !== this._generation) {
            return
          }
          if (this._active?.audio === audio) {
            this._active = null
          }
          if (this._pending?.audio === audio) {
            this._pending = null
          }
          this._mode = 'idle'
          this.onChanged(null)
          options.onEnded?.()
        }
      }
      this.adoptPending(audio, action, speed)
      audio.play()
    } finally {
      if (generation === this._generation) {
        this._loading = false
      }
    }
  }

  public adoptPending(audio: Sound, action: Action, speed = 5): void {
    if (!this._enabled) {
      audio.stop()
      return
    }
    this._pending?.audio.stop()
    audio.gain.value = 0
    this._pending = { actionId: action.id, audio, volume: 0 }
    this._targetVolume = action.volume
    this._speed = speed
    this._mode = 'fadeIn'
    this.onChanged(action.id)
  }

  public stop(): void {
    ++this._generation
    this._loading = false
    this._pending?.audio.stop()
    this._active?.audio.stop()
    this._pending = null
    this._active = null
    this._suppression = 0
    this._mode = 'idle'
    this._elapsed = 0
    this.onChanged(null)
  }

  public forget(): void {
    ++this._generation
    this._loading = false
    this._active = null
    this._pending = null
    this._mode = 'idle'
  }

  public pause(): void {
    this._active?.audio.pause()
    this._pending?.audio.pause()
  }

  public resume(): void {
    this._active?.audio.play()
    this._pending?.audio.play()
  }

  public lower(): void {
    if (this._suppression === 0) {
      if (this._mode === 'idle') {
        this._mode = 'fadeToTarget'
      }
      this._speed = 20
    }
    ++this._suppression
  }

  public raise(): void {
    if (this._suppression > 0) {
      --this._suppression
      if (this._suppression === 0) {
        if (this._mode === 'idle') {
          this._mode = 'fadeToTarget'
        }
        this._speed = 10
      }
    }
  }

  public setEnabled(enabled: boolean): void {
    if (this._enabled !== enabled) {
      this._enabled = enabled
      if (!enabled) {
        this.stop()
      }
    }
  }

  public update(delta: number): void {
    this._elapsed += delta
    while (this._elapsed + 1e-9 >= 0.1) {
      this._elapsed -= 0.1
      this._tick()
    }
  }

  private _tick(): void {
    const limit = this._suppression > 0 ? 30 : this._targetVolume
    if (this._mode === 'fadeIn') {
      if (this._active != null) {
        if (this._active.volume === 0) {
          this._active.audio.stop()
          this._active = null
        } else {
          this._setVolume(this._active, Math.max(0, this._active.volume - this._speed))
        }
      } else if (this._pending != null) {
        if (this._pending.volume >= limit) {
          this._setVolume(this._pending, limit)
          this._active = this._pending
          this._pending = null
          this._mode = 'idle'
        } else {
          this._setVolume(this._pending, Math.min(limit, this._pending.volume + this._speed))
        }
      }
    } else if (this._mode === 'fadeToTarget' && this._active != null) {
      const volume = this._active.volume
      this._setVolume(this._active, volume < limit ? Math.min(limit, volume + this._speed) : Math.max(limit, volume - this._speed))
      if (this._active.volume === limit) {
        this._mode = 'idle'
      }
    }
  }

  private _setVolume(track: Track, volume: number): void {
    track.volume = volume
    track.audio.gain.value = volumeToGain(volume)
  }
}
