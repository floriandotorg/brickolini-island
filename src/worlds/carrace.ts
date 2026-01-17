import { _CarRace_World, irtx08ra_PlayWav, srt001rh_RunAnim, srt001sl_RunAnim, srt002rh_RunAnim, srt002sl_RunAnim, srt003rh_RunAnim, srt003sl_RunAnim, srt004sl_RunAnim, srt005sl_RunAnim } from '../actions/carrace'
import * as carracerActions from '../actions/carracer'
import { RaceTrackRoad_Music } from '../actions/jukebox'
import { Action } from '../actions/types'
import { isRunAnimationAction } from '../lib/action-types'
import { getAction } from '../lib/assets/load'
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
  public override async onEventStartWaypoint(data: number): Promise<void> {
    const action = Object.values(carracerActions).find(action => action.id === data)
    if (action == null) {
      throw new Error(`Unknown waypoint action: ${data}`)
    }
    if (action.type === Action.Type.Event) {
      void getAction(action).then(buffer => {
        const content = new TextDecoder().decode(buffer)
        if (content[12] === '\x02') {
          const nameStart = 16
          const nameEnd = content.indexOf('\x00', nameStart)
          if (nameEnd === -1) {
            throw new Error('Malformed variable table: missing name NUL')
          }
          const name = content.slice(nameStart, nameEnd)
          const valueStart = nameEnd + 1
          const valueEnd = content.indexOf('\x00', valueStart)
          if (valueEnd === -1) {
            throw new Error('Malformed variable table: missing value NUL')
          }
          const value = content.slice(valueStart, valueEnd)

          console.log(`Setting variable: ${name} = ${value}`)

          if (name === 'tempBackgroundColor') {
            const parts = value.trim().split(/\s+/)
            if (parts.length === 4 && parts[0] === 'set') {
              const h = Number.parseFloat(parts[1])
              const s = Number.parseFloat(parts[2])
              const l = Number.parseFloat(parts[3])
              if (!Number.isNaN(h) && !Number.isNaN(s) && !Number.isNaN(l)) {
                this.setTemporarySkyColor({ h, s, l })
              } else {
                console.warn(`Failed to parse numbers from value: ${value}`)
              }
            } else {
              console.warn(`Unexpected value format: ${value}`)
            }
          } else if (name === 'backgroundColor' && value === 'reset') {
            this.resetTemporarySkyColor()
          } else {
            console.warn(`Unknown variable: ${name} = ${value}`)
          }
        }
      })
    } else if (isRunAnimationAction(action)) {
      void this.playAnimation(action)
    } else {
      console.log(action)
    }
  }

  public override onEventEndWaypoint(data: number): void {
    console.log(`End waypoint: ${data}`)
  }
}
