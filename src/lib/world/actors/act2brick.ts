import * as THREE from 'three'
import type { IsleBase } from '../../../worlds/isle-base'
import type { Roi3D } from '../../assets/model'
import { engine } from '../../engine'
import { Actor } from '../actor'

let lastBrickHit = Number.NEGATIVE_INFINITY
export class Act2Brick extends Actor {
  private _audio: THREE.PositionalAudio | null = null
  private _whistling = false
  private _muted = false
  private _state: 'waiting' | 'placed' | 'collected' | 'removed' = 'waiting'
  private _fall: { start: THREE.Vector3; end: THREE.Vector3; elapsed: number } | null = null
  constructor(
    roi: Roi3D,
    isle: IsleBase,
    public readonly index = 0,
    private readonly _collected: (brick: Act2Brick) => void = () => {},
  ) {
    super(roi, isle)
    roi.name = `chbrick${index}`
    roi.visible = false
    roi.model.boundingSphere.center.y -= 0.3
    roi.model.boundingSphere.radius *= index < 6 ? 0.5 : 2
    const proxy = new THREE.Mesh(new THREE.SphereGeometry(roi.model.boundingSphere.radius), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }))
    proxy.position.copy(roi.model.boundingSphere.center)
    roi.model.add(proxy)
  }
  public get state() {
    return this._state
  }
  public place(start: THREE.Vector3, end = start): void {
    if (this._state === 'collected' || this._state === 'removed') {
      return
    }
    this._state = 'placed'
    this.roi.moveRoiTo(start)
    this.roi.visible = true
    this._fall = { start: start.clone(), end: end.clone(), elapsed: 0 }
  }
  public override update(delta: number): null {
    if (this._fall != null) {
      this._fall.elapsed += delta
      this.roi.moveRoiTo(this._fall.start.clone().lerp(this._fall.end, Math.min(1, Math.floor(this._fall.elapsed / 0.02) / 8)))
      if (this._fall.elapsed >= 0.16) {
        this._fall = null
      }
    }
    return null
  }
  public override async onClick(): Promise<boolean> {
    if (this._state !== 'placed' || !this.roi.model.visible) {
      return false
    }
    this._state = 'collected'
    this._fall = null
    this.roi.visible = false
    this.stopWhistle()
    this._collected(this)
    return true
  }
  public override onCollision(roi: Roi3D | null): void {
    if (roi != null) {
      return
    }
    const time = engine.elapsedTimeMilliseconds
    if (time - lastBrickHit > 1000) {
      void this._isle.playPositionalAudio('hitactor', this.roi.model)
    }
    lastBrickHit = time
  }
  public async playWhistle(): Promise<void> {
    if (this._whistling || this._state !== 'placed') {
      return
    }
    this._whistling = true
    const audio = await this._isle.playPositionalAudio('xwhistle', this.roi.model)
    if (!this._whistling || this._state !== 'placed') {
      audio.stop()
      return
    }
    this._audio = audio
    audio.setLoop(true)
    audio.setVolume(this._muted ? 0 : 1)
  }
  public mute(muted: boolean): void {
    this._muted = muted
    this._audio?.setVolume(muted ? 0 : 1)
  }
  public stopWhistle(): void {
    this._whistling = false
    if (this._audio?.isPlaying) {
      this._audio.stop()
    }
    this._audio = null
  }
  public remove(): void {
    this.stopWhistle()
    this.roi.visible = false
    this._state = 'removed'
    this._isle.removeActor(this)
  }
}
