import * as THREE from 'three'
import { _Act2Main, Avo906In_PlayWav, Avo907In_PlayWav, Avo908In_PlayWav, tja009ni_RunAnim, tns002br_RunAnim, tns003br_RunAnim, tns004br_RunAnim, tra031ni_RunAnim, tra032ni_RunAnim } from '../actions/act2main'
import { Jail_Music } from '../actions/jukebox'
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
        playerIsLateTimeout: Timeout
      }
    | {
        type: 'arrived-at-residential-area'
      } = {
    type: 'intro',
  }

  private _initialHelpAudioPlayed = false
  private _infomanIsTalking = false

  constructor() {
    super('act2', { wdbWorldName: 'ACT2', dtaWorldName: 'ACT2' })
  }

  public override async init(): Promise<void> {
    await super.init()

    await this.handleStartUpAction(_Act2Main)

    const block01 = this.getRoi('block01')
    const block01Placement = this.boundaryManager.getObjectPlacement('EDG01_04', 1, 0.5, 3, 0.5)
    block01.moveRoiTo(block01Placement.position.clone().add(new THREE.Vector3(1.5, 0, 0)), block01Placement.quaternion)
    block01.model.boundingSphere.radius *= 1.5

    const block02 = this.getRoi('block02')
    const block02Placement = this.boundaryManager.getObjectPlacement('EDG00_149', 0, 0.5, 2, 0.5)
    block02.moveRoiTo(block02Placement.position, block02Placement.quaternion)
    block02.model.boundingSphere.radius *= 1.5

    this.boundaryManager.onTrigger((name, data, direction, roi) => {
      console.log(`Boundary trigger: ${name}, ${data}, ${direction}, ${roi?.name}`)

      if (name[2] === 'C') {
        if (data === 0x2a && this._state.type === 'going-to-residential-area' && !this._infomanIsTalking) {
          this._infomanIsTalking = true
          engine.playAudio(Avo907In_PlayWav, 'speech').then(audio => {
            audio.onEnded = () => {
              this._infomanIsTalking = false
            }
          })
        }
        if (data === 0x32 && this._state.type === 'going-to-residential-area' && !this._infomanIsTalking) {
          const animation = this._state.playerIsLateTimeout.isExpired ? tra032ni_RunAnim : tra031ni_RunAnim
          this._state = { type: 'arrived-at-residential-area' }
          void this.playCameraAnimation(animation).then(() => {
            const block01 = this.getRoi('block01')
            block01.visible = false
            if (block01.actor == null) {
              throw new Error('Block01 actor not found')
            }
            this.removeActor(block01.actor)

            const block02 = this.getRoi('block02')
            block02.visible = false
            if (block02.actor == null) {
              throw new Error('Block02 actor not found')
            }
            this.removeActor(block02.actor)

            const { position, quaternion } = this.boundaryManager.getObjectPlacement('EDG01_27', 2, 0.5, 0, 0.5)
            this.getRoi('ambul').moveRoiTo(position, quaternion)
          })
        }
      }
    })
  }

  public override async activate(composer: Composer, _param?: unknown): Promise<void> {
    await super.activate(composer, _param)

    void engine.switchBackgroundMusic(Jail_Music)

    void this.playCameraAnimation(introAnimations[Math.floor(Math.random() * introAnimations.length)]).then(() => {
      this.playCameraAnimation(tja009ni_RunAnim).then(() => {
        this._state = {
          type: 'going-to-residential-area',
          helpInterval: engine.createInterval(90_000),
          initialHelpTimeout: engine.createTimeout(20_000),
          playerIsLateTimeout: engine.createTimeout(90_000),
        }
      })
    })
  }

  public override keyPressed(key: string): void {
    super.keyPressed(key)

    if (key === 'f' && import.meta.env.DEV) {
      this._playerMovement.toggleSlewMode()
    }
  }

  public override update(delta: number): void {
    super.update(delta)

    const { fromPos, toPos, normalizedSpeed } = this._playerMovement.update(delta, this.currentVehicle?.type ?? null)

    this.updateActors(delta, fromPos, toPos)

    this._dashboard.update(normalizedSpeed)

    this.boundaryManager.update(fromPos, toPos, null)

    if (this._state.type === 'going-to-residential-area' && this._state.helpInterval.resetExpired() && !this._infomanIsTalking) {
      this._infomanIsTalking = true
      void engine.playAudio(Avo908In_PlayWav, 'speech').then(audio => {
        audio.onEnded = () => {
          this._infomanIsTalking = false
        }
      })
    }

    if (this._state.type === 'going-to-residential-area' && this._state.initialHelpTimeout.isExpired && new THREE.Vector3(52, 5.25, -16.5).distanceTo(toPos) > 50 && !this._initialHelpAudioPlayed && !this._infomanIsTalking) {
      this._initialHelpAudioPlayed = true
      this._infomanIsTalking = true
      void engine.playAudio(Avo906In_PlayWav, 'speech').then(audio => {
        audio.onEnded = () => {
          this._infomanIsTalking = false
        }
      })
    }
  }
}
