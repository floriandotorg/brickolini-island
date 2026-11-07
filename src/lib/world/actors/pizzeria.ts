import type * as THREE from 'three'
import {
  Avo910In_PlayWav,
  Avo911In_PlayWav,
  Avo912In_PlayWav,
  Avo913In_PlayWav,
  Avo914In_PlayWav,
  Avo917In_PlayWav,
  nja001pr_RunAnim,
  pgs050nu_RunAnim,
  pgs051nu_RunAnim,
  pgs052nu_RunAnim,
  pho104re_RunAnim,
  pho105re_RunAnim,
  pho106re_RunAnim,
  pja126br_RunAnim,
  pja127br_RunAnim,
  pja129br_RunAnim,
  pja130br_RunAnim,
  pja131br_RunAnim,
  pja132br_RunAnim,
  pns018rd_RunAnim,
  pns019pr_RunAnim,
  pns021dl_RunAnim,
  pns022pr_RunAnim,
  pns042bm_RunAnim,
  pns043en_RunAnim,
  pns045p1_RunAnim,
  pns048pr_RunAnim,
  pns050p1_RunAnim,
  pns065rd_RunAnim,
  pns066db_RunAnim,
  pns067gd_RunAnim,
  pns069pr_RunAnim,
  pns096pr_RunAnim,
  pns097pr_RunAnim,
  pns098pr_RunAnim,
  pns099pr_RunAnim,
  pns122pr_RunAnim,
  pns125ni_RunAnim,
  pnsx48pr_RunAnim,
  pnsx69pr_RunAnim,
  pps025ni_RunAnim,
  pps026ni_RunAnim,
  pps027ni_RunAnim,
  ppz001pe_RunAnim,
  ppz006pa_RunAnim,
  ppz007pa_RunAnim,
  ppz008rd_RunAnim,
  ppz010pa_RunAnim,
  ppz011pa_RunAnim,
  ppz013pa_RunAnim,
  ppz016pe_RunAnim,
  ppz029rd_RunAnim,
  ppz031ma_RunAnim,
  ppz035pa_RunAnim,
  ppz036pa_RunAnim,
  ppz037ma_RunAnim,
  ppz038ma_RunAnim,
  ppz054ma_RunAnim,
  ppz055ma_RunAnim,
  ppz056ma_RunAnim,
  ppz059ma_RunAnim,
  ppz060ma_RunAnim,
  ppz061ma_RunAnim,
  ppz064ma_RunAnim,
  ppz075pa_RunAnim,
  ppz082pa_RunAnim,
  ppz084pa_RunAnim,
  ppz086bs_RunAnim,
  ppz088ma_RunAnim,
  ppz089ma_RunAnim,
  ppz090ma_RunAnim,
  ppz095pe_RunAnim,
  ppz107ma_RunAnim,
  ppz114pa_RunAnim,
  ppz117ma_RunAnim,
  ppz118ma_RunAnim,
  ppz119ma_RunAnim,
  ppz120pa_RunAnim,
  prt072sl_RunAnim,
  prt073sl_RunAnim,
  prt074sl_RunAnim,
  wns050p1_RunAnim,
} from '../../../actions/isle'
import { PizzaMission_Music } from '../../../actions/jukebox'
import { TRS302_OpenJailDoor } from '../../../actions/sndanim'
import { type AnimationAction, type AudioAction, isPlayableAnimationAction, isRunAnimationAction, type RunAnimationAction } from '../../../lib/action-types'
import { engine, type Sentinel, type Timeout } from '../../../lib/engine'
import type { PlayerCharacter } from '../../../lib/save-game'
import { Act1 } from '../../../worlds/act1'
import { act1State } from '../../act1-state'
import type { Audio } from '../../assets/audio'
import { deliveryScore, isPizzaDestination } from '../../mission-rules.ts'
import { switchWorld } from '../../switch-world'
import { Actor } from '../actor'
import { Skateboard } from './skateboard'

const introAnimations: {
  [key in PlayerCharacter]: RunAnimationAction[]
} = {
  pepper: [ppz107ma_RunAnim, ppz114pa_RunAnim, ppz114pa_RunAnim],
  mama: [ppz001pe_RunAnim, ppz006pa_RunAnim, ppz007pa_RunAnim],
  papa: [ppz054ma_RunAnim, ppz055ma_RunAnim, ppz056ma_RunAnim],
  nick: [ppz031ma_RunAnim, ppz035pa_RunAnim, ppz036pa_RunAnim],
  laura: [ppz075pa_RunAnim, ppz082pa_RunAnim, ppz084pa_RunAnim],
}

const missionAnimations: {
  [key in PlayerCharacter]: (RunAnimationAction | AnimationAction | null)[]
} = {
  pepper: [pnsx48pr_RunAnim, pnsx69pr_RunAnim, pns125ni_RunAnim, pns122pr_RunAnim, null, null, ppz120pa_RunAnim, ppz117ma_RunAnim, ppz118ma_RunAnim, ppz119ma_RunAnim, nja001pr_RunAnim, nja001pr_RunAnim, nja001pr_RunAnim],
  mama: [pns022pr_RunAnim, pns021dl_RunAnim, pns018rd_RunAnim, pns019pr_RunAnim, ppz008rd_RunAnim, null, ppz013pa_RunAnim, ppz010pa_RunAnim, ppz011pa_RunAnim, ppz016pe_RunAnim, pps025ni_RunAnim, pps026ni_RunAnim, pps027ni_RunAnim],
  papa: [pns065rd_RunAnim, pns066db_RunAnim, pns067gd_RunAnim, pns069pr_RunAnim, null, null, ppz061ma_RunAnim, ppz059ma_RunAnim, ppz060ma_RunAnim, ppz064ma_RunAnim, prt072sl_RunAnim, prt073sl_RunAnim, prt074sl_RunAnim],
  nick: [pns042bm_RunAnim, pns043en_RunAnim, pns045p1_RunAnim, pns048pr_RunAnim, ppz029rd_RunAnim, null, ppz038ma_RunAnim, ppz037ma_RunAnim, ppz037ma_RunAnim, ppz037ma_RunAnim, pgs050nu_RunAnim, pgs051nu_RunAnim, pgs052nu_RunAnim],
  laura: [pns096pr_RunAnim, pns097pr_RunAnim, pns098pr_RunAnim, pns099pr_RunAnim, null, ppz086bs_RunAnim, ppz090ma_RunAnim, ppz088ma_RunAnim, ppz089ma_RunAnim, ppz095pe_RunAnim, pho104re_RunAnim, pho105re_RunAnim, pho106re_RunAnim],
}

const helpLines: Record<PlayerCharacter, AudioAction> = { pepper: Avo914In_PlayWav, mama: Avo910In_PlayWav, papa: Avo912In_PlayWav, nick: Avo911In_PlayWav, laura: Avo913In_PlayWav }

type PizzaPhase = 'idle' | 'introduction' | 'waiting' | 'accepting' | 'delivering' | 'arrived' | 'declining' | 'transitioning'

export class Pizzeria extends Actor {
  private readonly _acceptanceIndices: Record<PlayerCharacter, number> = { pepper: -1, mama: -1, papa: -1, nick: -1, laura: -1 }
  private _phase: PizzaPhase = 'idle'
  private _generation = 0
  private _timer: Timeout | null = null
  private _removePizzaTimer: Timeout | null = null
  private _helpAudioPlayed = false
  private _playedLocationAnimation = false
  private _speech: Audio | null = null
  private _speechGeneration = 0
  private _duck: Sentinel | null = null

  public get pizzaMissionActive(): boolean {
    return this.missionActive
  }

  public get missionActive(): boolean {
    return this._phase !== 'idle'
  }

  public get isInCutscene(): boolean {
    return this._phase === 'accepting' || this._phase === 'transitioning'
  }

  public handleSpace(): void {
    this.act1.toggleManagedAnimations(true)
  }

  private get act1(): Act1 {
    if (!(this._isle instanceof Act1)) {
      throw new Error('Pizza mission requires Act1')
    }
    return this._isle
  }

  public override async init(): Promise<void> {
    if (!(this._isle instanceof Act1)) {
      return
    }
    this.act1.boundaryManager.onTrigger((name, data, _direction, roi) => {
      if (roi != null || this._phase !== 'delivering') {
        return
      }
      const player = engine.currentSaveGame.player
      if (name[2] === 'W' && !this._playedLocationAnimation && ((data === 0x15e && player === 'pepper') || (data === 0x15f && player === 'papa'))) {
        this._playedLocationAnimation = true
        void this.act1.playAnimation(player === 'pepper' ? pns050p1_RunAnim : wns050p1_RunAnim)
      }
      if (isPizzaDestination(player, name[2], data)) {
        void this.arrive()
      }
    })
  }

  private stopSpeech = (): void => {
    ++this._speechGeneration
    this._speech?.stop()
    this._speech = null
    if (this._duck != null) {
      engine.raiseBackgroundMusic(this._duck)
      this._duck = null
    }
  }

  private speak = (action: AudioAction): void => {
    this.stopSpeech()
    const generation = this._speechGeneration
    this._duck = engine.lowerBackgroundMusic()
    void engine.playAudio(action, 'speech').then(audio => {
      if (generation !== this._speechGeneration) {
        audio.stop()
        return
      }
      this._speech = audio
      audio.onEnded = this.stopSpeech
    })
  }

  private stopAmbients = (): void => {
    for (const action of [...missionAnimations[engine.currentSaveGame.player].slice(0, 4), pns050p1_RunAnim, wns050p1_RunAnim]) {
      if (action != null) {
        this.act1.stopAnimationsInRange(action.siFile, action.id)
      }
    }
  }

  private reset = (): void => {
    ++this._generation
    this.stopSpeech()
    this.stopAmbients()
    this._phase = 'idle'
    this._timer = null
    this._removePizzaTimer = null
    this.act1.getActor('skate', Skateboard).showPizza = false
    this.act1.resumeHeldActor('papa')
    this.act1.cameraAnimationTriggerEnabled = true
    this.act1.backgroundMusicTriggerEnabled = true
    this.act1.allowExtras = true
    this._playedLocationAnimation = false
    act1State.value = 'none'
  }

  public abort(): void {
    if (!this.missionActive) {
      return
    }
    this.reset()
    for (const action of [...Object.values(introAnimations).flat(), ...Object.values(missionAnimations).flat(), pja126br_RunAnim, pja127br_RunAnim, pja129br_RunAnim, pja130br_RunAnim, pja131br_RunAnim, pja132br_RunAnim]) {
      if (action != null) {
        this.act1.stopAnimationsInRange(action.siFile, action.id)
      }
    }
  }

  public override async onClick(): Promise<boolean> {
    if (this.missionActive || !this.act1.canExit) {
      return false
    }
    if (this.act1.currentVehicle != null && this.act1.currentVehicle.type !== 'skate') {
      this.act1.currentVehicle.exit()
    }
    this.act1.skipAllRunningAnimations(true)
    const generation = ++this._generation
    this._phase = 'introduction'
    await this.act1.extras.placeMamaAndPapa()
    act1State.value = 'pizza'
    this.act1.cameraAnimationTriggerEnabled = false
    this.act1.backgroundMusicTriggerEnabled = false
    this.act1.allowExtras = false
    const save = engine.currentSaveGame
    const player = save.player
    this._acceptanceIndices[player] = Math.min(2, this._acceptanceIndices[player] + 1)
    const index = save.getPizzeriaPlaylist(player)
    save.setPizzeriaPlaylist(player, Math.min(2, index + 1))
    void this.act1.playCameraAnimation(introAnimations[player][index], undefined, undefined, false, undefined, ['papa']).then(() => {
      if (generation === this._generation && this._phase === 'introduction') {
        this._phase = 'waiting'
        this._timer = engine.createTimeout(5_000)
      }
    })
    return true
  }

  public onPizzaClicked(): void {
    if (this._phase !== 'introduction' && this._phase !== 'waiting') {
      return
    }
    this._phase = 'accepting'
    const generation = this._generation
    const action = missionAnimations[engine.currentSaveGame.player][7 + this._acceptanceIndices[engine.currentSaveGame.player]]
    if (!isRunAnimationAction(action)) {
      throw new Error('Invalid pizza acceptance action')
    }
    this.act1.skipAllRunningAnimations(true)
    void engine.switchBackgroundMusic(PizzaMission_Music)
    void this.act1.playCameraAnimation(action).then(async () => {
      if (generation !== this._generation) {
        return
      }
      this.act1.resumeHeldActor('papa')
      this._phase = 'delivering'
      this._timer = engine.createTimeout(350_000)
      this._helpAudioPlayed = false
      this.act1.placeVehicle('skate', 'INT37', 2, 0.5, 3, 0.5, true)
      const skateboard = this.act1.getActor('skate', Skateboard)
      skateboard.showPizza = true
      await skateboard.enter()
      if (generation !== this._generation) {
        return
      }
      for (const ambient of missionAnimations[engine.currentSaveGame.player].slice(0, 4)) {
        if (isPlayableAnimationAction(ambient)) {
          void this.act1.playAnimation(ambient)
        }
      }
    })
  }

  private playFinish = async (action: RunAnimationAction, removeAfter?: number): Promise<void> => {
    this.stopSpeech()
    if (removeAfter != null) {
      this._removePizzaTimer = engine.createTimeout(removeAfter)
    }
    await this.act1.playCameraAnimation(action)
  }

  private arrive = async (): Promise<void> => {
    const generation = this._generation
    const save = engine.currentSaveGame
    const player = save.player
    const score = deliveryScore(this._timer?.millisecondsSinceStart ?? 0)
    save.recordScore('pizza', player, score)
    this._phase = 'arrived'
    this.stopSpeech()
    this.stopAmbients()
    if (player !== 'pepper') {
      const action = missionAnimations[player][score === 'red' ? 10 : score === 'blue' ? 11 : 12]
      if (!isRunAnimationAction(action)) {
        throw new Error('Invalid pizza finish action')
      }
      const delay = { mama: 3800, papa: 7000, nick: 6400, laura: 6500 }[player]
      await this.playFinish(action, delay)
    } else {
      await this.act1.playAnimation(TRS302_OpenJailDoor)
      if (generation !== this._generation) {
        return
      }
      if (save.getVehiclePlacement('helicopter') != null) {
        this._phase = 'transitioning'
        engine.input.disable()
        engine.input.allowSpaceWhileDisabled = true
        await this.playFinish(pja132br_RunAnim, 2300)
        if (generation === this._generation) {
          act1State.value = 'none'
          this._phase = 'idle'
          save.act = 2
          void switchWorld('act2')
        }
        return
      }
      const counter = save.getPizzaCounter(player)
      if (counter === 1) {
        save.setPizzaCounter(player, 2)
        await this.playFinish(pja126br_RunAnim)
        if (generation !== this._generation) {
          return
        }
        await this.playFinish(pja127br_RunAnim, 700)
      } else if (counter === 2) {
        save.setPizzaCounter(player, 3)
        await this.playFinish(pja129br_RunAnim, 500)
        if (generation !== this._generation) {
          return
        }
        await this.playFinish(pja130br_RunAnim)
      } else {
        await this.playFinish(pja131br_RunAnim, 500)
      }
    }
    if (generation === this._generation) {
      this.reset()
    }
  }

  public override update(_delta: number): { from: THREE.Vector3; to: THREE.Vector3 } | null {
    if (this._phase === 'waiting' && this._timer?.isExpired) {
      const generation = this._generation
      this._phase = 'declining'
      engine.currentSaveGame.recordScore('pizza', engine.currentSaveGame.player, 'grey')
      this.act1.allowExtras = true
      const action = missionAnimations[engine.currentSaveGame.player][6]
      if (isRunAnimationAction(action)) {
        void this.act1.playCameraAnimation(action).then(() => {
          if (generation === this._generation) {
            this.reset()
          }
        })
      }
    }
    if (this._phase === 'delivering' && this._timer != null) {
      if (!this._helpAudioPlayed && this._timer.millisecondsSinceStart >= 35_000) {
        this._helpAudioPlayed = true
        this.speak(helpLines[engine.currentSaveGame.player])
      }
      if (this._timer.isExpired) {
        engine.currentSaveGame.recordScore('pizza', engine.currentSaveGame.player, 'grey')
        this.abort()
        this.speak(Avo917In_PlayWav)
      }
    }
    if (this._removePizzaTimer?.isExpired) {
      this.act1.getActor('skate', Skateboard).showPizza = false
      this._removePizzaTimer = null
    }
    return null
  }
}
