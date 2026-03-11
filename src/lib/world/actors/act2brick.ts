import type * as THREE from 'three'
import type { PositionalAudio } from 'three'
import { Actor } from '../actor'

export class Act2Brick extends Actor {
  private _audio: PositionalAudio | null = null
  private _state: 'waiting' | 'placed' | 'collected' = 'waiting'

  public get state(): 'waiting' | 'placed' | 'collected' {
    return this._state
  }

  public place(location: THREE.Vector3): void {
    if (this._state !== 'waiting') {
      throw new Error('Unable to place actor while it is not waiting')
    }
    this._state = 'placed'
    this.roi.moveRoiTo(location)
    this.roi.visible = true
  }

  public override async onClick(): Promise<boolean> {
    if (this._state === 'placed') {
      this._state = 'collected'
      this.roi.visible = false
      return true
    }
    return false
  }

  public async playWhistle(): Promise<void> {
    this._audio = await this._isle.playPositionalAudio('xwhistle', this.roi.model)
    this._audio.setLoop(true)
  }

  public stopWhistle(): void {
    if (this._audio != null) {
      this._audio.stop()
      this._audio = null
    }
  }
}
