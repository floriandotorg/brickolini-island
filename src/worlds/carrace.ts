import type * as THREE from 'three'
import { irtx08ra_PlayWav, srt001rh_RunAnim, srt001sl_RunAnim, srt002rh_RunAnim, srt002sl_RunAnim, srt003rh_RunAnim, srt003sl_RunAnim, srt004sl_RunAnim, srt005sl_RunAnim } from '../actions/carrace'
import { RaceTrackRoad_Music } from '../actions/jukebox'
import type { Composer } from '../lib/effect/composer'
import { engine } from '../lib/engine'
import { PlayerMovement } from '../lib/world/player-movement'
import { IsleBase } from './isle-base'

const introAnimations = [srt001sl_RunAnim, srt002sl_RunAnim, srt003sl_RunAnim, srt004sl_RunAnim, srt005sl_RunAnim, srt001rh_RunAnim, srt002rh_RunAnim, srt003rh_RunAnim]

export class CarRace extends IsleBase {
  private _playerMovement = new PlayerMovement(
    this.camera,
    this._groundGroup,
    () => this._boundaryManager.walls,
    () => this._isleMesh,
  )

  constructor() {
    super('carrace', 'RACC')
  }

  public override async activate(composer: Composer, _param?: unknown): Promise<void> {
    await super.activate(composer)
    this._dashboard.activate(composer)

    void engine.switchBackgroundMusic(RaceTrackRoad_Music)
    void this.playAnimation(introAnimations[Math.floor(Math.random() * introAnimations.length)]).then(() => {
      void engine.playAudio(irtx08ra_PlayWav, 'speech')
    })
  }

  protected override get debugPositionDirection(): { position: THREE.Vector3; direction: THREE.Vector3; slewMode: boolean } | null {
    return this._playerMovement.getDebugInfo()
  }

  public override keyPressed(key: string): void {
    super.keyPressed(key)

    if (key === 'f' && import.meta.env.DEV) {
      this._playerMovement.toggleSlewMode()
    }

    if (key === 'm') {
      engine.currentSaveGame.nextSunPosition()
      this._updateSun()
    }
  }

  public override update(delta: number): void {
    super.update(delta)

    if (this.isRunningCameraAnimation) {
      return
    }

    const { normalizedSpeed } = this._playerMovement.update(delta, null)
    this._dashboard.update(normalizedSpeed)
  }
}
