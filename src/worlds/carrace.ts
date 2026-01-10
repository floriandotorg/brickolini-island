import { _CarRace_World, irtx08ra_PlayWav, srt001rh_RunAnim, srt001sl_RunAnim, srt002rh_RunAnim, srt002sl_RunAnim, srt003rh_RunAnim, srt003sl_RunAnim, srt004sl_RunAnim, srt005sl_RunAnim } from '../actions/carrace'
import { RaceTrackRoad_Music } from '../actions/jukebox'
import type { Composer } from '../lib/effect/composer'
import { engine } from '../lib/engine'
import { Race } from './race'

const introAnimations = [srt001sl_RunAnim, srt002sl_RunAnim, srt003sl_RunAnim, srt004sl_RunAnim, srt005sl_RunAnim, srt001rh_RunAnim, srt002rh_RunAnim, srt003rh_RunAnim]

export class CarRace extends Race {
  constructor() {
    super('carrace', { wdbWorldName: 'RACC', dtaWorldName: 'RACC', startUpAction: _CarRace_World })
  }

  public override async activate(composer: Composer, _param?: unknown): Promise<void> {
    await super.activate(composer)

    await this._dashboard.show({ type: 'racecar' })

    void engine.switchBackgroundMusic(RaceTrackRoad_Music)
    void this.playAnimation(introAnimations[Math.floor(Math.random() * introAnimations.length)]).then(() => {
      void engine.playAudio(irtx08ra_PlayWav, 'speech')
    })
  }
}
