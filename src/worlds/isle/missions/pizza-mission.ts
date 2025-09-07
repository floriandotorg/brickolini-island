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
import { Action } from '../../../actions/types'
import type { AnimationAction, RunAnimationAction } from '../../../lib/action-types'
import { engine, type PlayerCharacter } from '../../../lib/engine'
import type { Isle } from '../index'

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
  laura: [pnsx69pr_RunAnim, pns097pr_RunAnim, pns098pr_RunAnim, pns099pr_RunAnim, null, ppz086bs_RunAnim, ppz090ma_RunAnim, ppz088ma_RunAnim, ppz089ma_RunAnim, ppz095pe_RunAnim, pho104re_RunAnim, pho105re_RunAnim, pho106re_RunAnim],
}

enum MissionState {
  NotStarted,
  Introduction,
  WaitAcceptQuest,
  Delivering,
}

export class PizzaMission {
  private readonly playerState: { [key in PlayerCharacter]: number } = {
    pepper: 0,
    mama: 0,
    papa: 0,
    nick: 0,
    laura: 0,
  }

  private _missionState: MissionState = MissionState.NotStarted
  private _timeoutTimer: number | null = null
  private _missionStartedTime: number = 0
  private _helpAudioPlayed: boolean = false
  private _playedLocationAnimation: boolean = false

  constructor(private readonly isle: Isle) {}

  async init(): Promise<void> {
    this.isle.addClickListener(this.isle.getObjectsByPrefix('pizza'), async () => {
      if (this.isle.cameraAnimationPlaying || this._missionState !== MissionState.NotStarted) {
        return false
      }

      this._missionState = MissionState.Introduction

      const actions = introAnimations[engine.currentPlayerCharacterSafe]
      const action = actions[this.playerState[engine.currentPlayerCharacterSafe]]
      this.playerState[engine.currentPlayerCharacterSafe] = Math.min(this.playerState[engine.currentPlayerCharacterSafe] + 1, actions.length - 1)

      this.isle.playCameraAnimation(action).then(() => {
        this._missionState = MissionState.WaitAcceptQuest
        this._timeoutTimer = setTimeout(() => {
          const action = missionAnimations[engine.currentPlayerCharacterSafe][4 + 2]
          if (action == null) {
            throw new Error('Action is null')
          }
          if (action.type === Action.Type.ObjectAction) {
            throw new Error('Action is not a run animation action')
          }
          this.isle.playCameraAnimation(action)
          this.abort()
        }, 5_000)
      })

      return true
    })

    this.isle.addClickListener(this.isle.getObjectsByPrefix('pizpie'), async () => {
      if (this._timeoutTimer != null) {
        clearTimeout(this._timeoutTimer)
        this._timeoutTimer = null
      }

      if (this._missionState === MissionState.Introduction || this._missionState === MissionState.WaitAcceptQuest) {
        const action = missionAnimations[engine.currentPlayerCharacterSafe][7 + this.playerState[engine.currentPlayerCharacterSafe]]
        if (action == null) {
          throw new Error('Action is null')
        }

        if (action.type === Action.Type.ObjectAction) {
          throw new Error('Action is not a run animation action')
        }

        this.isle.skipAllRunningAnimations(true)
        engine.switchBackgroundMusic(PizzaMission_Music)
        void this.isle.playCameraAnimation(action).then(() => {
          this._missionState = MissionState.Delivering
          this.isle.cameraAnimationTriggerEnabled = false
          this.isle.backgroundMusicTriggerEnabled = false
          this.isle.placeVehicle('skate', 'INT37', 2, 0.5, 3, 0.5)
          this.isle.enterVehicle({ type: 'skate', showPizza: true })
          this._missionStartedTime = engine.clock.getElapsedTime()
          this._helpAudioPlayed = false
          for (let n = 0; n < 4; ++n) {
            const action = missionAnimations[engine.currentPlayerCharacterSafe][n]
            if (action == null) {
              throw new Error('Action is null')
            }
            this.isle.playAnimation(action)
          }
        })
      }

      return true
    })
  }

  public abort(): void {
    this._missionState = MissionState.NotStarted
    this.isle.hidePizzaIfOnSkateboard()
    this.isle.skipAllRunningAnimations(true)
    this.isle.cameraAnimationTriggerEnabled = true
    this.isle.backgroundMusicTriggerEnabled = true
    this._missionStartedTime = 0
    this._playedLocationAnimation = false
  }

  public update(): void {
    if (this._missionState === MissionState.Delivering) {
      if (!this._helpAudioPlayed && engine.clock.getElapsedTime() - this._missionStartedTime > 35) {
        this._helpAudioPlayed = true
        switch (engine.currentPlayerCharacterSafe) {
          case 'pepper':
            engine.playAudio(Avo914In_PlayWav)
            break
          case 'mama':
            engine.playAudio(Avo910In_PlayWav)
            break
          case 'papa':
            engine.playAudio(Avo912In_PlayWav)
            break
          case 'nick':
            engine.playAudio(Avo911In_PlayWav)
            break
          case 'laura':
            engine.playAudio(Avo913In_PlayWav)
            break
        }
      }

      if (engine.clock.getElapsedTime() - this._missionStartedTime > 350) {
        engine.playAudio(Avo917In_PlayWav)
        this.abort()
      }
    }
  }

  public handleWTrigger(data: number) {
    if (this._missionState !== MissionState.Delivering) {
      return
    }

    if (data === 0x15e && engine.currentPlayerCharacter === 'pepper' && !this._playedLocationAnimation) {
      this._playedLocationAnimation = true
      this.isle.playAnimation(pns050p1_RunAnim)
    } else if (data === 0x15f && engine.currentPlayerCharacter === 'papa' && !this._playedLocationAnimation) {
      this._playedLocationAnimation = true
      this.isle.playAnimation(wns050p1_RunAnim)
    }
  }
}
