import * as THREE from 'three'
import { npz001bd_RunAnim, npz002bd_RunAnim, npz003bd_RunAnim, npz004bd_RunAnim, npz006bd_RunAnim, npz007bd_RunAnim } from '../../../actions/isle'
import { JBMusic1, JBMusic2, JBMusic3, JBMusic4, JBMusic5, JBMusic6 } from '../../../actions/jukebox'
import type { IsleBase } from '../../../worlds/isle-base'
import type { AudioAction, RunAnimationAction } from '../../action-types'
import type { Roi3D } from '../../assets/model'
import { engine } from '../../engine'
import { jukeBoxState } from '../../jukebox-state'
import { switchWorld } from '../../switch-world'
import { Entity } from '../entity'

const BAND_ANIMATIONS: readonly RunAnimationAction[] = [npz001bd_RunAnim, npz006bd_RunAnim, npz003bd_RunAnim, npz002bd_RunAnim, npz007bd_RunAnim, npz004bd_RunAnim]
const MUSIC_ACTIONS: readonly AudioAction[] = [JBMusic1, JBMusic2, JBMusic3, JBMusic4, JBMusic5, JBMusic6]

export class JukeBoxEntity extends Entity {
  private _unsubscribe: (() => void) | null = null
  private _currentMusicActionId: number | null = null

  constructor(
    roi: Roi3D,
    private readonly _isle: IsleBase,
  ) {
    super(roi)
  }

  public override async onClick(): Promise<boolean> {
    if (this._isle.currentVehicle != null) {
      this._isle.currentVehicle.exit()
    }
    void switchWorld('jukeboxw')
    return true
  }

  public startAction(): void {
    const music = jukeBoxState.music
    const bandAnimation = BAND_ANIMATIONS[music]
    const musicAction = MUSIC_ACTIONS[music]
    if (bandAnimation == null || musicAction == null) {
      return
    }

    engine.stopBackgroundMusic()
    jukeBoxState.active = true
    this._currentMusicActionId = musicAction.id

    void this._isle.playAnimation(bandAnimation, { overrideLoop: THREE.LoopRepeat })

    if (this._unsubscribe == null) {
      this._unsubscribe = engine.onBackgroundMusicChanged(actionId => {
        if (jukeBoxState.active && actionId !== this._currentMusicActionId) {
          this.stopAction()
        }
      })
    }

    void engine.switchBackgroundMusic(musicAction)
  }

  public stopAction(): void {
    if (!jukeBoxState.active) {
      return
    }
    jukeBoxState.active = false
    this._currentMusicActionId = null
    this._isle.stopLoopingAnimations()
    if (this._unsubscribe != null) {
      this._unsubscribe()
      this._unsubscribe = null
    }
  }
}
