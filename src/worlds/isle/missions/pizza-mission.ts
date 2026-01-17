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
import { Action } from '../../../actions/types'
import { type AnimationAction, isRunAnimationAction, type RunAnimationAction } from '../../../lib/action-types'
import { engine, type Timeout } from '../../../lib/engine'
import type { PlayerCharacter } from '../../../lib/save-game'
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

const redFinishTime = 100_000
const blueFinishTime = 200_000

export class PizzaMission {
  private readonly playerState: { [key in PlayerCharacter]: number } = {
    pepper: 0,
    mama: 0,
    papa: 0,
    nick: 0,
    laura: 0,
  }

  private _missionState:
    | {
        state: 'not-started' | 'introduction' | 'timeout-accept-quest'
      }
    | {
        state: 'waiting-for-accept-quest'
        timeout: Timeout
      }
    | {
        state: 'delivering'
        helpAudioTimeout: Timeout
        missionTimeout: Timeout
      }
    | {
        state: 'arrived-at-destination'
        removePizzaTimeout: Timeout
      } = {
    state: 'not-started',
  }
  private _helpAudioPlayed: boolean = false
  private _playedLocationAnimation: boolean = false
  private _pepperBroughtPizzaWithoutHelicopterCount: number = 0

  public get isActive(): boolean {
    return this._missionState.state !== 'not-started'
  }

  constructor(private readonly isle: Isle) {}

  async init(): Promise<void> {
    this.isle.addClickListener(this.isle.getObjectsByPrefix('pizza'), async () => {
      if (this._missionState.state !== 'not-started') {
        return false
      }

      this.isle.skipAllRunningAnimations(true)

      this._missionState = { state: 'introduction' }

      const actions = introAnimations[engine.currentSaveGame.player]
      const action = actions[this.playerState[engine.currentSaveGame.player]]
      this.playerState[engine.currentSaveGame.player] = Math.min(this.playerState[engine.currentSaveGame.player] + 1, actions.length - 1)

      void this.isle.playCameraAnimation(action).then(() => {
        this._missionState = { state: 'waiting-for-accept-quest', timeout: engine.createTimeout(5_000) }
      })

      return true
    })

    this.isle.addClickListener(this.isle.getObjectsByPrefix('pizpie'), async () => {
      if (this._missionState.state === 'introduction' || this._missionState.state === 'waiting-for-accept-quest') {
        this._missionState = { state: 'delivering', helpAudioTimeout: engine.createTimeout(35_000), missionTimeout: engine.createTimeout(350_000) }

        const action = missionAnimations[engine.currentSaveGame.player][7 + this.playerState[engine.currentSaveGame.player]]
        if (action == null) {
          throw new Error('Action is null')
        }

        if (action.type === Action.Type.ObjectAction) {
          throw new Error('Action is not a run animation action')
        }

        this.isle.skipAllRunningAnimations(true)
        void engine.switchBackgroundMusic(PizzaMission_Music)
        void this.isle.playCameraAnimation(action).then(() => {
          this.isle.cameraAnimationTriggerEnabled = false
          this.isle.backgroundMusicTriggerEnabled = false
          this.isle.placeVehicle('skate', 'INT37', 2, 0.5, 3, 0.5, true)
          void this.isle.enterVehicle({ type: 'skate', showPizza: true })
          this._helpAudioPlayed = false
          for (let n = 0; n < 4; ++n) {
            const action = missionAnimations[engine.currentSaveGame.player][n]
            if (action == null) {
              throw new Error('Action is null')
            }
            void this.isle.playAnimation(action)
          }
        })
      }

      return true
    })
  }

  private _reset(): void {
    this._missionState = { state: 'not-started' }
    this.isle.hidePizzaIfOnSkateboard()
    this.isle.cameraAnimationTriggerEnabled = true
    this.isle.backgroundMusicTriggerEnabled = true
    this._playedLocationAnimation = false
  }

  public abort(): void {
    this.isle.skipAllRunningAnimations(true)
    this._reset()
  }

  public update(): void {
    if (this._missionState.state === 'waiting-for-accept-quest' && this._missionState.timeout.isExpired) {
      this._missionState = { state: 'timeout-accept-quest' }
      const action = missionAnimations[engine.currentSaveGame.player][4 + 2]
      if (!isRunAnimationAction(action)) {
        throw new Error('Action is not a run animation action')
      }
      void this.isle.playCameraAnimation(action).then(() => {
        this.abort()
      })
    }

    if (this._missionState.state === 'delivering') {
      if (!this._helpAudioPlayed && this._missionState.helpAudioTimeout.isExpired) {
        this._helpAudioPlayed = true
        switch (engine.currentSaveGame.player) {
          case 'pepper':
            void engine.playAudio(Avo914In_PlayWav, 'speech')
            break
          case 'mama':
            void engine.playAudio(Avo910In_PlayWav, 'speech')
            break
          case 'papa':
            void engine.playAudio(Avo912In_PlayWav, 'speech')
            break
          case 'nick':
            void engine.playAudio(Avo911In_PlayWav, 'speech')
            break
          case 'laura':
            void engine.playAudio(Avo913In_PlayWav, 'speech')
            break
        }
      }

      if (this._missionState.missionTimeout.isExpired) {
        void engine.playAudio(Avo917In_PlayWav, 'speech')
        this.abort()
      }
    }

    if (this._missionState.state === 'arrived-at-destination' && this._missionState.removePizzaTimeout.isExpired) {
      this._reset()
    }
  }

  public handleTrigger(name: string, data: number): boolean {
    if (this._missionState.state !== 'delivering') {
      return false
    }

    if (name === 'W' && data === 0x15e && engine.currentSaveGame.playerUnsafe === 'pepper' && !this._playedLocationAnimation) {
      this._playedLocationAnimation = true
      void this.isle.playAnimation(pns050p1_RunAnim)
      return true
    } else if (name === 'W' && data === 0x15f && engine.currentSaveGame.playerUnsafe === 'papa' && !this._playedLocationAnimation) {
      this._playedLocationAnimation = true
      void this.isle.playAnimation(wns050p1_RunAnim)
      return true
    } else if (
      (name === 'S' && data === 0x12e && engine.currentSaveGame.playerUnsafe === 'pepper') ||
      (name === 'C' &&
        (((data === 0x24 || data === 0x22) && engine.currentSaveGame.playerUnsafe === 'mama') ||
          (data === 0x33 && engine.currentSaveGame.playerUnsafe === 'papa') ||
          ((data === 0x08 || data === 0x09) && engine.currentSaveGame.playerUnsafe === 'nick') ||
          (data === 0x0b && engine.currentSaveGame.playerUnsafe === 'laura'))) ||
      (name === 'W' && data === 0x169 && engine.currentSaveGame.playerUnsafe === 'nick')
    ) {
      const finish = this._missionState.missionTimeout.millisecondsSinceStart < redFinishTime ? 'red' : this._missionState.missionTimeout.millisecondsSinceStart < blueFinishTime ? 'blue' : 'yellow'

      if (engine.currentSaveGame.playerUnsafe !== 'pepper') {
        const animation = missionAnimations[engine.currentSaveGame.player][4 + (finish === 'red' ? 6 : finish === 'blue' ? 7 : 8)]
        if (animation == null) {
          throw new Error('Animation is null')
        }

        const millisecondsUntilRemovePizza = (() => {
          switch (animation.id) {
            case pps025ni_RunAnim.id:
            case pps026ni_RunAnim.id:
            case pps027ni_RunAnim.id:
              return 3_800
            case pgs050nu_RunAnim.id:
            case pgs051nu_RunAnim.id:
            case pgs052nu_RunAnim.id:
              return 6_400
            case prt072sl_RunAnim.id:
            case prt073sl_RunAnim.id:
            case prt074sl_RunAnim.id:
              return 7_000
            case pho104re_RunAnim.id:
            case pho105re_RunAnim.id:
            case pho106re_RunAnim.id:
              return 6_500
          }

          throw new Error('Invalid animation id')
        })()

        if (animation.type === Action.Type.ObjectAction) {
          throw new Error('Action is not a run animation action')
        }
        void this.isle.playCameraAnimation(animation).then(() => {
          this.isle.skipAllRunningAnimations(true)
        })

        this._missionState = { state: 'arrived-at-destination', removePizzaTimeout: engine.createTimeout(millisecondsUntilRemovePizza) }
      } else {
        void this.isle.playAnimation(TRS302_OpenJailDoor).then(() => {
          if (!engine.hasBuiltHelicopter) {
            switch (this._pepperBroughtPizzaWithoutHelicopterCount) {
              case 0:
                ++this._pepperBroughtPizzaWithoutHelicopterCount
                void this.isle.playCameraAnimation(pja126br_RunAnim).then(() => {
                  this._missionState = { state: 'arrived-at-destination', removePizzaTimeout: engine.createTimeout(700) }
                  void this.isle.playCameraAnimation(pja127br_RunAnim).then(() => {
                    this.isle.skipAllRunningAnimations(true)
                  })
                })
                break
              case 1:
                ++this._pepperBroughtPizzaWithoutHelicopterCount
                this._missionState = { state: 'arrived-at-destination', removePizzaTimeout: engine.createTimeout(500) }
                void this.isle.playCameraAnimation(pja129br_RunAnim).then(() => {
                  void this.isle.playCameraAnimation(pja130br_RunAnim).then(() => {
                    this.isle.skipAllRunningAnimations(true)
                  })
                })
                break
              case 2:
                this._missionState = { state: 'arrived-at-destination', removePizzaTimeout: engine.createTimeout(500) }
                void this.isle.playCameraAnimation(pja131br_RunAnim).then(() => {
                  this.isle.skipAllRunningAnimations(true)
                })
                break
            }
          } else {
            this._missionState = { state: 'arrived-at-destination', removePizzaTimeout: engine.createTimeout(2_300) }
            void this.isle.playCameraAnimation(pja132br_RunAnim).then(() => {
              this.isle.skipAllRunningAnimations(true)
            })
          }
        })
      }

      return true
    }

    return false
  }
}
