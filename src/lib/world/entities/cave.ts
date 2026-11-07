import type * as THREE from 'three'
import { Avo900Ps_PlayWav, Avo901Ps_PlayWav, Avo902Ps_PlayWav, Avo903Ps_PlayWav, Avo904Ps_PlayWav, nca001ca_RunAnim, nca002sk_RunAnim, nca003gh_RunAnim } from '../../../actions/isle'
import type { IsleBase } from '../../../worlds/isle-base'
import type { Audio } from '../../assets/audio'
import { type Roi3D, RoiModel } from '../../assets/model'
import { engine } from '../../engine'
import { Entity } from '../entity'

const chestAnimations = [nca001ca_RunAnim, nca002sk_RunAnim, nca003gh_RunAnim]
const doorVoices = [Avo900Ps_PlayWav, Avo901Ps_PlayWav, Avo902Ps_PlayWav, Avo903Ps_PlayWav, Avo904Ps_PlayWav]
let nextChest = 0
let nextVoice = 0

export class CaveEntity extends Entity {
  private _voice: Audio | null = null
  private _sentinel: symbol | null = null
  private _generation = 0

  constructor(
    roi: Roi3D,
    private readonly _world: IsleBase,
  ) {
    super(roi)
    _world.onDeactivate(() => this._stopVoice())
  }

  private _stopVoice = (): void => {
    ++this._generation
    const audio = this._voice
    this._voice = null
    audio?.stop()
    if (this._sentinel != null) {
      engine.raiseBackgroundMusic(this._sentinel)
      this._sentinel = null
    }
  }

  public override async onClick(object?: THREE.Object3D): Promise<boolean> {
    let target = object
    while (target != null) {
      const name = (target instanceof RoiModel ? (target.roi3dOrNull?.name ?? target.name) : target.name).toLowerCase()
      if (name.startsWith('chest')) {
        this._world.stopAnimationsInRange('isle', 800, 802)
        const action = chestAnimations[nextChest]
        nextChest = (nextChest + 1) % chestAnimations.length
        void this._world.playAnimation(action)
        return true
      }
      if (name === 'cavedoor' || name.startsWith('cavedoor-')) {
        this._stopVoice()
        const generation = this._generation
        const action = doorVoices[nextVoice]
        nextVoice = (nextVoice + 1) % doorVoices.length
        this._sentinel = engine.lowerBackgroundMusic()
        try {
          const audio = await engine.playAudio(action, 'speech')
          if (generation !== this._generation) {
            audio.stop()
          } else {
            this._voice = audio
            audio.onEnded = this._stopVoice
          }
        } catch (error) {
          if (generation === this._generation) {
            this._stopVoice()
          }
          throw error
        }
        return true
      }
      if (target === this.roi.model) {
        break
      }
      target = target.parent ?? undefined
    }
    return true
  }
}
