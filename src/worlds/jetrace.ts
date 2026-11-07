import * as Actions from '../actions/jetrace'
import * as Triggers from '../actions/jetracer'
import { JetskiRace_Music } from '../actions/jukebox'
import { act1State } from '../lib/act1-state'
import { isPlayableAnimationAction } from '../lib/action-types'
import type { Audio } from '../lib/assets/audio'
import type { Composer } from '../lib/effect/composer'
import { engine } from '../lib/engine'
import { raceResults } from '../lib/race-state.ts'
import { switchWorld } from '../lib/switch-world'
import { JetskiRacer } from '../lib/world/actors/jetski-racer.ts'
import { Race } from './race'

export class JetRace extends Race {
  private _visit = 0
  private _horn: Audio | null = null

  constructor() {
    super('jetrace', {
      wdbWorldName: 'RACJ',
      dtaWorldName: 'RACJ',
      startUpAction: Actions._JetRace_World,
      config: {
        userActorName: Actions.UserJetski_Actor.name,
        opponents: [
          { roiName: 'snap', progressLocator: Actions.JetskiLocator2, vehicle: null },
          { roiName: 'valerie', progressLocator: Actions.JetskiLocator3, vehicle: null },
        ],
        progressRect: [397, 317, 543, 333],
        distance: { offset: 0.032, scale: 0.936 },
        maxSpeed: 15,
        vehicleType: 'jetski',
        ignoreDirection: true,
      },
    })
  }

  public override async activate(composer: Composer): Promise<void> {
    const visit = ++this._visit
    this.raceState = 'waiting'
    raceResults.jetski = false
    await super.activate(composer)
    const placement = this.boundaryManager.getObjectPlacement('edg10_77', 0, 0.5, 2, 0.5)
    this.camera.position.copy(placement.position)
    this.camera.quaternion.copy(placement.quaternion)
    this.camera.translateY(1)
    this.camera.translateZ(0.5)
    await this._dashboard.show({ type: 'jetski' })
    this._dashboard.onExit = () => {
      this.escape()
      void switchWorld({ spawn: 'jetraceExterior' })
    }
    this._dashboard.onInfoButtonClicked = () => {
      this.escape()
      void switchWorld({ ending: null })
    }
    void engine.switchBackgroundMusic(JetskiRace_Music)
    const horn = await engine.playAudio(Actions.AirHorn_PlayWav, 'effects')
    if (visit !== this._visit) {
      horn.stop()
      return
    }
    this._horn = horn
    horn.onEnded = () => {
      if (visit === this._visit) {
        this.setActorSoundsMuted(false)
        this.raceState = 'racing'
      }
    }
  }

  protected override onOpponentFinished(index: number): void {
    const actor = this.findRoi(index === 0 ? 'snap' : 'valerie')?.actor
    if (actor instanceof JetskiRacer) {
      actor.maximumSpeed = 0.1
    }
  }

  protected override onPlayerWaypoint(data: number, lap: number): void {
    if (data === 15) {
      this._applyVisibility(lap * 2 + 1)
    }
  }

  protected override async onPlayerFinished(): Promise<void> {
    const opponentsFinished = Number(this._opponent1Progress.finished) + Number(this._opponent2Progress.finished)
    engine.currentSaveGame.recordScore('jetskiRace', engine.currentSaveGame.player, opponentsFinished === 0 ? 'red' : opponentsFinished === 1 ? 'blue' : 'yellow')
    raceResults.jetski = true
    act1State.value = 'transitionToJetski'
    await switchWorld({ spawn: 'jetraceFinished' })
  }

  public override onEventStartWaypoint(data: number): void {
    const action = Object.values(Triggers).find(action => action.id === data)
    if (isPlayableAnimationAction(action)) {
      void this.playAnimation(action)
    }
  }

  public override onEventEndWaypoint(data: number): void {
    this.stopAnimationsInRange('jetracer', data)
  }

  public override escape(): boolean {
    ++this._visit
    this._horn?.stop()
    act1State.value = 'none'
    return super.escape()
  }

  public override deactivate(): void {
    ++this._visit
    this._horn?.stop()
    super.deactivate()
  }
}
