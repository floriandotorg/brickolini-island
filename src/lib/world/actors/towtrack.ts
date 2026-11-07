import * as THREE from 'three'
import * as IsleActions from '../../../actions/isle'
import { JBMusic2 } from '../../../actions/jukebox'
import { Act1 } from '../../../worlds/act1'
import { act1State } from '../../act1-state'
import type { AudioAction, RunAnimationAction } from '../../action-types'
import type { Audio } from '../../assets/audio'
import type { SpawnLocation } from '../../assets/spawn-location'
import { engine, type Sentinel } from '../../engine'
import { towFinishIndex, towScore } from '../../tow-rules.ts'
import type { IsleMission } from '../isle-mission.ts'
import { FuelVehicle } from './fuel-vehicle'

const ambients = [IsleActions.wns057rd_RunAnim, IsleActions.wns048p1_RunAnim, IsleActions.wns049p1_RunAnim, IsleActions.wns051bd_RunAnim, IsleActions.wns053pr_RunAnim, IsleActions.wns045di_RunAnim, IsleActions.pns123pr_RunAnim]
const scenery = [IsleActions.wns050p1_RunAnim, IsleActions.wns046mg_RunAnim]
const reactions = [IsleActions.wrt074sl_RunAnim, IsleActions.wrt075rh_RunAnim, IsleActions.wrt076df_RunAnim, IsleActions.wrt078ni_RunAnim]
const colorFinishes = { red: IsleActions.wgs083nu_RunAnim, blue: IsleActions.wgs090nu_RunAnim, yellow: IsleActions.wgs097nu_RunAnim }
const characterFinishes = {
  red: [IsleActions.wgs085nu_RunAnim, IsleActions.wgs086nu_RunAnim, IsleActions.wgs087nu_RunAnim, IsleActions.wgs088nu_RunAnim, IsleActions.wgs089nu_RunAnim],
  blue: [IsleActions.wgs091nu_RunAnim, IsleActions.wgs092nu_RunAnim, IsleActions.wgs093nu_RunAnim, IsleActions.wgs094nu_RunAnim, IsleActions.wgs095nu_RunAnim],
  yellow: [IsleActions.wgs098nu_RunAnim, IsleActions.wgs099nu_RunAnim, IsleActions.wgs100nu_RunAnim, IsleActions.wgs101nu_RunAnim, IsleActions.wgs102nu_RunAnim],
}
const waypointSpeech = {
  pepper: [IsleActions.wns034na_PlayWav],
  mama: [IsleActions.wns037na_PlayWav, IsleActions.wns038na_PlayWav],
  papa: [IsleActions.wns041na_PlayWav, IsleActions.wns042na_PlayWav],
  nick: [IsleActions.wns039na_PlayWav, IsleActions.wns040na_PlayWav],
  laura: [IsleActions.wns043na_PlayWav, IsleActions.wns044na_PlayWav],
}

export class TowTrack extends FuelVehicle implements IsleMission {
  public override type = 'towtk' as const
  protected override dashboard = { type: 'towtk' } as const
  protected override explanationAnimation = null
  protected override explanationAnimationOffset = null
  protected override drainsOnlyWhenActive = true
  protected override hideOnExit = true
  protected override persistPlacement = false
  private _phase: 'idle' | 'starting' | 'outbound' | 'hooking' | 'returning' | 'finishing' = 'idle'
  private _generation = 0
  private _startTime = 0
  private _warned = false
  private _treePlayed = false
  private _flowersPlayed = false
  private _speech: Audio | null = null
  private _speechToken = 0
  private _duck: Sentinel | null = null
  private _horn: Audio | null = null
  private _currentAnimation: RunAnimationAction | null = null

  private get act1(): Act1 {
    if (!(this._isle instanceof Act1)) {
      throw new Error('Tow mission requires Act1')
    }
    return this._isle
  }

  public get missionActive(): boolean {
    return this._phase !== 'idle'
  }

  public get isInCutscene(): boolean {
    return this._phase === 'starting' || this._phase === 'hooking' || this._phase === 'finishing'
  }

  public override async init(): Promise<void> {
    engine.currentSaveGame.clearVehiclePlacement(this.type)
    this.roi.visible = false
    this.act1.boundaryManager.onTrigger((name, data, _direction, roi) => {
      if (roi != null || act1State.value !== 'towtrack' || this.act1.currentVehicle !== this) {
        return
      }
      if (this._phase === 'returning' && ((name[2] === 'C' && (data === 8 || data === 9)) || (name[2] === 'W' && data === 0x169))) {
        void this.finish()
      } else if (this._phase === 'outbound' && name[2] === 'C' && data === 0x37) {
        void this.hookUp()
      } else if (this._phase === 'outbound' && name[2] === 'W') {
        if (data === 0x15f && !this._treePlayed) {
          this._treePlayed = true
          void this.act1.playAnimation(scenery[0])
        }
        if (data === 0x160) {
          if (!this._flowersPlayed) {
            this._flowersPlayed = true
            void this.act1.playAnimation(scenery[1])
          }
          if (!this._warned && this._duck == null) {
            const lines = waypointSpeech[engine.currentSaveGame.player]
            this.speak(lines[Math.floor(Math.random() * lines.length)])
          }
        }
      }
    })
  }

  public startMission = async (): Promise<void> => {
    if (this.missionActive) {
      return
    }
    const generation = ++this._generation
    this._phase = 'starting'
    this.act1.allowExtras = false
    this.act1.cameraAnimationTriggerEnabled = false
    this.act1.backgroundMusicTriggerEnabled = false
    await this.enterAt('garageExited')
    if (generation !== this._generation) {
      return
    }
    this._phase = 'outbound'
    this._startTime = engine.elapsedTimeMilliseconds
    this._warned = false
    this.speak(IsleActions.wgs032nu_PlayWav)
    for (const action of ambients) {
      void this.act1.playAnimation(action, { overrideLoop: THREE.LoopRepeat })
    }
  }

  private enterAt = async (spawn: SpawnLocation): Promise<void> => {
    const generation = this._generation
    const placement = this.act1.boundaryManager.getObjectPlacementFromLocation(spawn)
    this.roi.moveRoiTo(placement.position, placement.quaternion)
    await this.enter()
    if (generation !== this._generation) {
      return
    }
    void engine.switchBackgroundMusic(JBMusic2)
    this.act1.dashboard.onHornToggle = on => {
      void this.toggleHorn(on)
    }
    const car = this.act1.findRoi('rcred')
    if (car != null) {
      car.visible = false
    }
  }

  private toggleHorn = async (on: boolean): Promise<void> => {
    if (!on) {
      this._horn?.stop()
      return
    }
    const generation = this._generation
    const horn = this._horn ?? (await engine.getAudio(IsleActions.TowHorn_Sound, 'effects'))
    if (generation === this._generation && this.missionActive) {
      this._horn = horn
      horn.loop = true
      horn.playAgain()
    }
  }

  private stopSpeech = (): void => {
    ++this._speechToken
    this._speech?.stop()
    this._speech = null
    if (this._duck != null) {
      engine.raiseBackgroundMusic(this._duck)
      this._duck = null
    }
  }

  private speak = (action: AudioAction): void => {
    this.stopSpeech()
    const token = this._speechToken
    this._duck = engine.lowerBackgroundMusic()
    void engine.playAudio(action, 'speech').then(audio => {
      if (token !== this._speechToken) {
        audio.stop()
        return
      }
      this._speech = audio
      audio.onEnded = this.stopSpeech
    })
  }

  private stopScenery = (): void => {
    for (const action of [...scenery, ...ambients]) {
      this.act1.stopAnimationsInRange(action.siFile, action.id)
    }
  }

  private play = async (action: RunAnimationAction): Promise<void> => {
    this._currentAnimation = action
    await this.act1.playCameraAnimation(action)
    if (this._currentAnimation === action) {
      this._currentAnimation = null
    }
  }

  private leaveTruck = (): void => {
    this.stopSpeech()
    this._horn?.stop()
    this.act1.dashboard.onHornToggle = null
    super.exit()
  }

  private hookUp = async (): Promise<void> => {
    this._phase = 'hooking'
    const generation = this._generation
    this.stopScenery()
    this.leaveTruck()
    await this.play(IsleActions.wrt060bm_RunAnim)
    if (generation !== this._generation) {
      return
    }
    const count = engine.currentSaveGame.player === 'nick' ? 3 : 4
    await this.play(reactions[Math.floor(Math.random() * count)])
    if (generation !== this._generation) {
      return
    }
    await this.enterAt('towTrackHookedUp')
    if (generation === this._generation) {
      this._phase = 'returning'
      this.speak(IsleActions.wrt082na_PlayWav)
    }
  }

  private finish = async (): Promise<void> => {
    const color = towScore(engine.elapsedTimeMilliseconds - this._startTime)
    this._phase = 'finishing'
    const generation = this._generation
    const player = engine.currentSaveGame.player
    this.leaveTruck()
    await this.play(colorFinishes[color])
    if (generation !== this._generation) {
      return
    }
    engine.currentSaveGame.recordScore('towTrack', player, color)
    this.act1.allowExtras = true
    if (color === 'red') {
      this.act1.cameraAnimationTriggerEnabled = true
      this.act1.backgroundMusicTriggerEnabled = true
    }
    await this.play(characterFinishes[color][towFinishIndex(player)])
    if (generation === this._generation) {
      this.cleanUp()
    }
  }

  private cleanUp = (): void => {
    this.stopSpeech()
    this.stopScenery()
    this._horn?.stop()
    this._horn = null
    this._phase = 'idle'
    act1State.value = 'none'
    this.act1.allowExtras = true
    this.act1.cameraAnimationTriggerEnabled = true
    this.act1.backgroundMusicTriggerEnabled = true
    this.act1.dashboard.onHornToggle = null
  }

  public reset = (): void => {
    ++this._generation
    this.leaveTruck()
    this.cleanUp()
    this._treePlayed = false
    this._flowersPlayed = false
    this._warned = false
    if (this._currentAnimation != null) {
      this.act1.stopAnimationsInRange(this._currentAnimation.siFile, this._currentAnimation.id)
      this._currentAnimation = null
    }
  }

  public abort = (): void => this.reset()

  public override exit(): void {
    this.reset()
  }

  public override async onClick(): Promise<boolean> {
    if (act1State.value !== 'towtrack' || this.isInCutscene || !this.missionActive) {
      return false
    }
    await this.enterAt(this._phase === 'returning' ? 'towTrackHookedUp' : 'garageExited')
    return true
  }

  public handleSpace = (): void => {
    if (this._currentAnimation != null) {
      this.act1.stopAnimationsInRange(this._currentAnimation.siFile, this._currentAnimation.id)
    }
  }

  public override update(delta: number): null {
    super.update(delta)
    if (this._phase === 'outbound' && this.act1.currentVehicle === this && !this._warned && engine.elapsedTimeMilliseconds - this._startTime > 100_000) {
      this._warned = true
      this.speak(IsleActions.Avo909In_PlayWav)
    }
    return null
  }
}
