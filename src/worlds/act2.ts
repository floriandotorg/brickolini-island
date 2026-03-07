import * as THREE from 'three'
import { _Act2Main, Avo906In_PlayWav, Avo908In_PlayWav, tja009ni_RunAnim, tns002br_RunAnim, tns003br_RunAnim, tns004br_RunAnim } from '../actions/act2main'
import type { Composer } from '../lib/effect/composer'
import { engine, type Interval, type Timeout } from '../lib/engine'
import { PlayerMovement } from '../lib/world/player-movement'
import { IsleBase } from './isle-base'

const introAnimations = [tns002br_RunAnim, tns003br_RunAnim, tns004br_RunAnim]

export class Act2 extends IsleBase {
  private readonly _playerMovement = new PlayerMovement(
    this.camera,
    this._groundGroup,
    () => this.boundaryManager.walls,
    () => this._isleMesh,
  )

  private _state:
    | {
        type: 'intro'
      }
    | {
        type: 'going-to-residential-area'
        helpInterval: Interval
        initialHelpTimeout: Timeout
      } = {
    type: 'intro',
  }

  private _initialHelpAudioPlayed = false

  constructor() {
    super('act2', { wdbWorldName: 'ACT2', dtaWorldName: 'ACT2' })
  }

  public override async init(): Promise<void> {
    await super.init()

    await this.handleStartUpAction(_Act2Main)
  }

  public override async activate(composer: Composer, _param?: unknown): Promise<void> {
    await super.activate(composer, _param)

    void this.playCameraAnimation(introAnimations[Math.floor(Math.random() * introAnimations.length)]).then(() => {
      this.playCameraAnimation(tja009ni_RunAnim).then(() => {
        this._state = {
          type: 'going-to-residential-area',
          helpInterval: engine.createInterval(90_000),
          initialHelpTimeout: engine.createTimeout(20_000),
        }
      })
    })
  }

  public override update(delta: number): void {
    super.update(delta)

    const { fromPos, toPos, normalizedSpeed } = this._playerMovement.update(delta, this.currentVehicle?.type ?? null)

    this.updateActors(delta, fromPos, toPos)

    this._dashboard.update(normalizedSpeed)

    this.boundaryManager.update(fromPos, toPos, null)

    if (this._state.type === 'going-to-residential-area' && this._state.helpInterval.resetExpired()) {
      void engine.playAudio(Avo908In_PlayWav, 'speech')
    }

    if (this._state.type === 'going-to-residential-area' && this._state.initialHelpTimeout.isExpired && new THREE.Vector3(52, 5.25, -16.5).distanceTo(toPos) > 50 && !this._initialHelpAudioPlayed) {
      this._initialHelpAudioPlayed = true
      void engine.playAudio(Avo906In_PlayWav, 'speech')
    }
  }
}
