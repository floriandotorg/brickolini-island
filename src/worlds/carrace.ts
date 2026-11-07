import * as RaceActions from '../actions/carrace'
import { _CarRace_World, irtx08ra_PlayWav, srt001rh_RunAnim, srt001sl_RunAnim, srt002rh_RunAnim, srt002sl_RunAnim, srt003rh_RunAnim, srt003sl_RunAnim, srt004sl_RunAnim, srt005sl_RunAnim } from '../actions/carrace'
import * as carracerActions from '../actions/carracer'
import { RaceTrackRoad_Music } from '../actions/jukebox'
import { Action } from '../actions/types'
import { isRunAnimationAction } from '../lib/action-types'
import type { Audio } from '../lib/assets/audio'
import { getAction } from '../lib/assets/load'
import type { Composer } from '../lib/effect/composer'
import { engine } from '../lib/engine'
import type { ScoreColor } from '../lib/score.ts'
import { switchWorld } from '../lib/switch-world'
import { Race } from './race'

const introAnimations = [srt001sl_RunAnim, srt002sl_RunAnim, srt003sl_RunAnim, srt004sl_RunAnim, srt005sl_RunAnim, srt001rh_RunAnim, srt002rh_RunAnim, srt003rh_RunAnim]

export class CarRace extends Race {
  private _visit = 0
  private _countdown: Audio | null = null
  constructor() {
    super('carrace', { wdbWorldName: 'RACC', dtaWorldName: 'RACC', startUpAction: _CarRace_World })
  }

  public override async activate(composer: Composer, _param?: unknown): Promise<void> {
    const visit = ++this._visit
    this.raceState = 'waiting'
    await super.activate(composer)

    await this._dashboard.show({ type: 'racecar' })

    this._dashboard.onExit = () => {
      this.escape()
      void switchWorld({ spawn: 'carraceExterior' })
    }

    this._dashboard.onInfoButtonClicked = () => {
      this.escape()
      void switchWorld({ ending: null })
    }
    void engine.switchBackgroundMusic(RaceTrackRoad_Music)
    void this.playAnimation(introAnimations[Math.floor(Math.random() * introAnimations.length)], { managed: true, lockCamera: true }).then(async () => {
      if (visit !== this._visit || this.raceState !== 'waiting') {
        return
      }
      const placement = this.boundaryManager.getObjectPlacement('edg03_03', 0, 0.5, 2, 0.5)
      this.camera.position.copy(placement.position)
      this.camera.quaternion.copy(placement.quaternion)
      this.camera.translateY(1)
      this.camera.translateZ(0.5)
      const audio = await engine.playAudio(irtx08ra_PlayWav, 'speech')
      if (visit !== this._visit) {
        audio.stop()
        return
      }
      this._countdown = audio
      audio.onEnded = () => {
        if (visit === this._visit && this.raceState === 'waiting') {
          this.setActorSoundsMuted(false)
          this.raceState = 'racing'
        }
      }
    })
  }

  protected override async onPlayerFinished(): Promise<void> {
    const visit = this._visit
    this.setActorSoundsMuted(true)
    const studsFinished = this._opponent2Progress.finished
    const rhodaFinished = this._opponent1Progress.finished
    const score: ScoreColor = studsFinished && rhodaFinished ? 'yellow' : studsFinished || rhodaFinished ? 'blue' : 'red'
    engine.currentSaveGame.recordScore('carRace', engine.currentSaveGame.player, score)
    this.stopOpponent('studs', 'rcblack', false)
    this.stopOpponent('rhoda', 'rcgreen', false)
    engine.input.disable()
    engine.input.allowSpaceWhileDisabled = true
    const studsWins = [RaceActions.srt011sl_RunAnim, RaceActions.srt012sl_RunAnim, RaceActions.srt013sl_RunAnim, RaceActions.srt014sl_RunAnim]
    const studsLoses = [RaceActions.srt015sl_RunAnim, RaceActions.srt016sl_RunAnim, RaceActions.srt017sl_RunAnim]
    const rhodaWins = [RaceActions.srt007rh_RunAnim, RaceActions.srt008rh_RunAnim, RaceActions.srt009rh_RunAnim]
    const rhodaLoses = [RaceActions.srt010rh_RunAnim, RaceActions.srt011rh_RunAnim, RaceActions.srt012rh_RunAnim]
    const first = rhodaFinished && !studsFinished ? rhodaWins : studsFinished ? studsWins : studsLoses
    const second = rhodaFinished && !studsFinished ? studsLoses : rhodaFinished ? rhodaWins : rhodaLoses
    await this.playAnimation(first[Math.floor(Math.random() * first.length)], { managed: true, lockCamera: true })
    if (visit !== this._visit) {
      return
    }
    await this.playAnimation(second[Math.floor(Math.random() * second.length)], { managed: true, lockCamera: true })
    if (visit === this._visit && this.raceState === 'finished') {
      void switchWorld({ spawn: 'carraceFinished' })
    }
  }

  public override escape(): boolean {
    ++this._visit
    this.setActorSoundsMuted(true)
    this._countdown?.stop()
    this._countdown = null
    return super.escape()
  }

  public override deactivate(): void {
    this.escape()
    super.deactivate()
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
                this.setTemporarySkyColor({ h: h / 100, s: l / 100, l: s / 100 })
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
    this.stopAnimationsInRange('carracer', data)
  }
}
