import * as THREE from 'three'
import {
  AmbulanceHorn_Sound,
  Avo915In_PlayWav,
  Avo916In_PlayWav,
  Avo923In_PlayWav,
  ham033cl_PlayWav,
  ham034ra_PlayWav,
  ham035ra_PlayWav,
  ham036ra_PlayWav,
  ham039ra_PlayWav,
  ham040cl_PlayWav,
  ham041cl_PlayWav,
  ham042cl_PlayWav,
  ham043cl_PlayWav,
  ham044cl_PlayWav,
  ham045cl_PlayWav,
  ham075cl_PlayWav,
  ham076cl_PlayWav,
  ham088cl_PlayWav,
  ham113cl_PlayWav,
  hho027en_RunAnim,
  hho142cl_RunAnim,
  hho143cl_RunAnim,
  hho144cl_RunAnim,
  hps116bd_RunAnim,
  hps117bd_RunAnim,
  hps118re_RunAnim,
  hpz037ma_PlayWav,
  hpz047pe_RunAnim,
  hpz048pe_RunAnim,
  hpz049bd_RunAnim,
  hpz050bd_RunAnim,
  hpz052ma_RunAnim,
  hpz053pa_RunAnim,
  hpz055pa_RunAnim,
  hpz057ma_RunAnim,
  pns018rd_RunAnim,
  sns078pa_PlayWav,
} from '../../../actions/isle'
import { Hospital_Music } from '../../../actions/jukebox'
import { Act1 } from '../../../worlds/act1'
import { act1State } from '../../act1-state'
import type { AudioAction, RunAnimationAction } from '../../action-types'
import type { Audio } from '../../assets/audio'
import type { SpawnLocation } from '../../assets/spawn-location'
import { engine, type Sentinel } from '../../engine'
import type { PlayerCharacter } from '../../save-game'
import { Vehicle } from './vehicle'

const beachApproachAnimations: Record<PlayerCharacter, RunAnimationAction> = {
  pepper: hpz049bd_RunAnim,
  mama: hpz047pe_RunAnim,
  papa: hpz050bd_RunAnim,
  nick: hpz048pe_RunAnim,
  laura: hpz048pe_RunAnim,
}

const banterLines = [ham034ra_PlayWav, ham035ra_PlayWav, ham036ra_PlayWav, hpz037ma_PlayWav, sns078pa_PlayWav, ham039ra_PlayWav, ham040cl_PlayWav, ham041cl_PlayWav, ham042cl_PlayWav, ham043cl_PlayWav, ham044cl_PlayWav, ham045cl_PlayWav]

const banterIntervalMilliseconds = 40_000
const redFinishTime = 300_000
const blueFinishTime = 400_000
const fuelConsumptionPerMs = 3.333333333e-6

const scoreColorValue = { grey: 0, yellow: 1, blue: 2, red: 3 } as const
type ScoreColor = keyof typeof scoreColorValue
const scoreColorByValue: Record<number, ScoreColor> = { 0: 'grey', 1: 'yellow', 2: 'blue', 3: 'red' }

type RunningState = {
  state: 'starting' | 'entered' | 'pickup' | 'returning'
  startTime: number
  fuel: number
  site?: 'beach' | 'police'
  phase?: 'waiting' | 'finished' | 'finish'
  color?: ScoreColor
}

export class Ambulance extends Vehicle {
  public override type = 'ambul' as const
  protected override dashboard = { type: 'ambul' } as const
  protected override explanationAnimation = null
  protected override explanationAnimationOffset = null

  private _missionState: RunningState | { state: 'idle' } = { state: 'idle' }
  private _beachDone = false
  private _policeDone = false
  private _inCutscene = false
  private _speechAudio: Audio | null = null
  private _speechPending = false
  private _speechToken = 0
  private _banterTimer = 0
  private _banterPrimed = false
  private _musicSentinel: Sentinel | null = null
  private _hornAudio: Audio | null = null
  private _skipArmed = false

  public get missionActive(): boolean {
    return this._missionState.state !== 'idle'
  }

  public get isInCutscene(): boolean {
    return this._inCutscene
  }

  private get act1(): Act1 {
    if (!(this._isle instanceof Act1)) {
      throw new Error('Ambulance is not in Act1')
    }
    return this._isle
  }

  public override async init(): Promise<void> {
    const psGate = this.act1.findRoi('ps-gate')
    if (psGate != null) {
      this.act1.addClickListener(psGate, async () => this.handlePickupClick('ps-gate'))
    }

    this.act1.boundaryManager.onTrigger((name, data, _direction, roi) => {
      if (roi != null || act1State.value !== 'ambulance' || this._missionState.state !== 'entered') {
        return
      }

      if (data === 0x168) {
        this._refuel()
        return
      }

      if (data === 0x131 && !this._beachDone) {
        void this._startPickup('beach')
      } else if (name[2] === 'C' && (data === 0x22 || data === 0x23 || data === 0x24) && !this._policeDone) {
        void this._startPickup('police')
      } else if (name[2] === 'C' && data === 0x0b) {
        if (this._beachDone && this._policeDone) {
          void this._returnToHospital()
        } else if (this._beachDone && !this._policeDone) {
          this._playSpeech(Avo915In_PlayWav)
        } else if (!this._beachDone && this._policeDone) {
          this._playSpeech(Avo916In_PlayWav)
        }
      }
    })
  }

  public async startMission(): Promise<void> {
    if (this._missionState.state !== 'idle') {
      return
    }

    this._inCutscene = true
    this._missionState = { state: 'starting', startTime: 0, fuel: 1 }

    await this._playCutsceneAnimation(hho027en_RunAnim)
    await this._enterDrivingState('hospitalExited', true)
  }

  public handleSpace(): void {
    if (this._skipArmed) {
      this._skipArmed = false
      this.act1.skipAllRunningAnimations(true)
    } else {
      this._skipArmed = true
    }
  }

  private async _playCutsceneAnimation(action: RunAnimationAction): Promise<void> {
    this._skipArmed = false
    await this.act1.playCameraAnimation(action)
  }

  private async _playLoopingCutsceneAnimation(action: RunAnimationAction): Promise<void> {
    this._skipArmed = false
    await this.act1.playCameraAnimation(action, undefined, undefined, true)
  }

  public override async onClick(): Promise<boolean> {
    if (act1State.value !== 'ambulance' || this._missionState.state !== 'idle') {
      return false
    }
    await this.startMission()
    return true
  }

  public get isInPickupPhase(): boolean {
    return this._missionState.state === 'pickup'
  }

  public handlePickupClick(name: string): boolean {
    if (act1State.value !== 'ambulance') {
      return false
    }
    const state = this._missionState
    if (state.state !== 'pickup' || state.phase !== 'waiting') {
      return false
    }
    if (name === 'ps-gate' || name === 'gd') {
      state.phase = 'finished'
      return true
    }
    return false
  }

  private async _enterDrivingState(spawn: SpawnLocation, isFirst: boolean): Promise<void> {
    const placement = this.act1.boundaryManager.getObjectPlacementFromLocation(spawn)
    this.roi.moveRoiTo(placement.position, placement.quaternion)
    await this.enter()

    this._isle.dashboard.onHornToggle = (on: boolean) => {
      void this._setHorn(on)
    }

    this._inCutscene = false
    this._missionState = {
      state: 'entered',
      startTime: this._missionState.state === 'starting' ? engine.elapsedTimeMilliseconds : (this._missionState as RunningState).startTime,
      fuel: this._missionState.state === 'starting' ? 1 : (this._missionState as RunningState).fuel,
    }
    this.act1.cameraAnimationTriggerEnabled = false
    this.act1.backgroundMusicTriggerEnabled = false
    void engine.switchBackgroundMusic(Hospital_Music)

    this._banterTimer = 0
    this._banterPrimed = false

    const sceneLine = isFirst ? ham033cl_PlayWav : this._beachDone && this._policeDone ? (Math.random() < 0.5 ? ham076cl_PlayWav : ham088cl_PlayWav) : Math.random() < 0.5 ? ham075cl_PlayWav : ham113cl_PlayWav
    this._playSpeech(sceneLine)

    if (!this._beachDone || !this._policeDone) {
      void this.act1.playAnimation(pns018rd_RunAnim, { overrideLoop: THREE.LoopRepeat })
    }
  }

  private async _setHorn(on: boolean): Promise<void> {
    if (on) {
      if (this._hornAudio == null) {
        this._hornAudio = await engine.getAudio(AmbulanceHorn_Sound, 'effects')
        this._hornAudio.loop = true
      }
      this._hornAudio.playAgain()
    } else {
      this._hornAudio?.stop()
    }
  }

  private _refuel(): void {
    if (this._missionState.state !== 'idle') {
      this._missionState.fuel = 1
    }
  }

  private _playSpeech(action: AudioAction): void {
    this._stopSpeech()
    const token = ++this._speechToken
    this._speechPending = true
    this._musicSentinel ??= engine.lowerBackgroundMusic()
    void engine.playAudio(action, 'speech').then(audio => {
      if (this._speechToken !== token) {
        audio.stop()
        return
      }
      this._speechPending = false
      this._speechAudio = audio
    })
  }

  private _stopSpeech(): void {
    ++this._speechToken
    this._speechPending = false
    this._speechAudio?.stop()
    this._speechAudio = null
    this._raiseMusic()
  }

  private _raiseMusic(): void {
    if (this._musicSentinel != null) {
      engine.raiseBackgroundMusic(this._musicSentinel)
      this._musicSentinel = null
    }
  }

  private async _startPickup(site: 'beach' | 'police'): Promise<void> {
    if (this._missionState.state !== 'entered') {
      return
    }
    const state = this._missionState
    this._missionState = { ...state, state: 'pickup', site, phase: 'waiting' }

    this._inCutscene = true
    this._stopSpeech()
    this._hornAudio?.stop()
    this.exit()
    this.act1.skipAllRunningAnimations(true)

    if (site === 'police') {
      await this._playCutsceneAnimation(hps116bd_RunAnim)
      if (this._missionState.state === 'pickup' && this._missionState.phase === 'waiting') {
        this._playSpeech(Avo923In_PlayWav)
      }
      while (this._missionState.state === 'pickup' && this._missionState.phase === 'waiting') {
        await this._playLoopingCutsceneAnimation(hps118re_RunAnim)
      }
    } else {
      const player = engine.currentSaveGame.player
      const approach = beachApproachAnimations[player]
      await this._playCutsceneAnimation(approach)
      const loopAnim = player === 'papa' ? hpz052ma_RunAnim : hpz053pa_RunAnim
      while (this._missionState.state === 'pickup' && this._missionState.phase === 'waiting') {
        await this._playLoopingCutsceneAnimation(loopAnim)
      }
    }
    if (this._missionState.state !== 'pickup') {
      this._inCutscene = false
      return
    }
    this._missionState.phase = 'finish'
    const finish = site === 'beach' ? (engine.currentSaveGame.player === 'papa' ? hpz057ma_RunAnim : hpz055pa_RunAnim) : hps117bd_RunAnim
    await this._playCutsceneAnimation(finish)

    if (this._missionState.state !== 'pickup') {
      this._inCutscene = false
      return
    }
    if (site === 'beach') {
      this._beachDone = true
    } else {
      this._policeDone = true
    }
    const nextSpawn: SpawnLocation = site === 'beach' ? 'pizzeriaExterior' : 'policeExited'
    await this._enterDrivingState(nextSpawn, false)

    if (this._beachDone && this._policeDone) {
      this.act1.skipAllRunningAnimations(true)
    }
  }

  private async _returnToHospital(): Promise<void> {
    if (this._missionState.state !== 'entered') {
      return
    }
    const state = this._missionState
    const elapsed = engine.elapsedTimeMilliseconds - state.startTime
    const color: ScoreColor = elapsed < redFinishTime ? 'red' : elapsed < blueFinishTime ? 'blue' : 'yellow'

    this._missionState = { ...state, state: 'returning', color }
    this._inCutscene = true
    this._stopSpeech()
    this._hornAudio?.stop()
    this.exit()
    this.act1.skipAllRunningAnimations(true)

    const finishAnimation = color === 'red' ? hho142cl_RunAnim : color === 'blue' ? hho143cl_RunAnim : hho144cl_RunAnim
    await this._playCutsceneAnimation(finishAnimation)
    this._inCutscene = false
    this._updateScore(color)
    this.reset()
  }

  private _updateScore(color: ScoreColor): void {
    const player = engine.currentSaveGame.player
    const value = scoreColorValue[color]
    engine.currentSaveGame.setAmbulanceCurrentScore(player, value)
    if (value > engine.currentSaveGame.getAmbulanceHighScore(player)) {
      engine.currentSaveGame.setAmbulanceHighScore(player, value)
    }
  }

  public reset(): void {
    this._stopSpeech()
    this._hornAudio?.stop()
    this._hornAudio = null
    this._isle.dashboard.onHornToggle = null
    this._missionState = { state: 'idle' }
    this._beachDone = false
    this._policeDone = false
    this._inCutscene = false
    act1State.value = 'none'
    this.act1.cameraAnimationTriggerEnabled = true
    this.act1.backgroundMusicTriggerEnabled = true
  }

  public abort(): void {
    this.act1.skipAllRunningAnimations(true)
    this.reset()
  }

  public override update(delta: number): { from: THREE.Vector3; to: THREE.Vector3 } | null {
    if (this._isle.currentVehicle === this && this._missionState.state !== 'idle') {
      const fuel = Math.max(0, this._missionState.fuel + delta * 1000 * -fuelConsumptionPerMs)
      this._missionState.fuel = fuel
      this._isle.dashboard.updateFuel(fuel)
    }

    if (this._speechAudio?.ended) {
      this._speechAudio = null
      this._raiseMusic()
    }

    if (this._missionState.state === 'entered' && !this.act1.isRunningCameraAnimation) {
      this._banterTimer += delta * 1000
      if (this._banterTimer >= banterIntervalMilliseconds) {
        this._banterTimer = 0
        if (!this._banterPrimed) {
          this._banterPrimed = true
        } else if (this._speechAudio == null && !this._speechPending) {
          const line = banterLines[Math.floor(Math.random() * banterLines.length)]
          if (line != null) {
            this._playSpeech(line)
          }
        }
      }
    }

    return null
  }

  public static getHighScore(player: PlayerCharacter): ScoreColor {
    return scoreColorByValue[engine.currentSaveGame.getAmbulanceHighScore(player)] ?? 'grey'
  }

  public static getCurrentScore(player: PlayerCharacter): ScoreColor {
    return scoreColorByValue[engine.currentSaveGame.getAmbulanceCurrentScore(player)] ?? 'grey'
  }
}
