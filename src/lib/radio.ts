import * as Tracks from '../actions/jukebox'
import type { AudioAction } from './action-types'
import { engine } from './engine'
import { RadioPlaylist } from './radio-playlist.ts'
import { onSessionReset } from './session-state.ts'

const lists: AudioAction[][] = [
  [Tracks.sns002ra_Audio, Tracks.sns001ja_Audio, Tracks.snsc01js_Audio, Tracks.snsb01js_Audio, Tracks.snsa01js_Audio, Tracks.sns009ra_Audio],
  [
    Tracks.ham035ra_Audio,
    Tracks.ham039ra_Audio,
    Tracks.sns005ra_Audio,
    Tracks.sns078pa_Audio,
    Tracks.ham036ra_Audio,
    Tracks.sns006ra_Audio,
    Tracks.sns013ra_Audio,
    Tracks.sns004ra_Audio,
    Tracks.sns079pa_Audio,
    Tracks.sns007ra_Audio,
    Tracks.sns008ra_Audio,
    Tracks.hpz037ma_Audio,
    Tracks.sns003ra_Audio,
    Tracks.sns010ra_Audio,
  ],
  [Tracks.CentralRoads_Music, Tracks.BeachBlvd_Music, Tracks.ResidentalArea_Music, Tracks.Radio1_Music, Tracks.Radio2_Music, Tracks.Radio3_Music, Tracks.Radio4_Music, Tracks.Radio5_Music, Tracks.Radio6_Music],
]
let playlist = new RadioPlaylist(lists)
let active = false
let musicWasEnabled = true
let resetControl: (() => void) | null = null

const next = (): void => {
  if (active) {
    void engine.switchBackgroundMusic(playlist.next(), 3, { loop: false, onEnded: next })
  }
}

export const radio = {
  get active(): boolean {
    return active
  },
  toggle: (reset: () => void): void => {
    if (active) {
      radio.stop()
    } else {
      musicWasEnabled = engine.music.enabled
      resetControl = reset
      engine.stopBackgroundMusic()
      engine.music.setEnabled(true)
      active = true
      next()
    }
  },
  stop: (): void => {
    if (active) {
      active = false
      engine.stopBackgroundMusic()
      engine.music.setEnabled(musicWasEnabled)
      resetControl?.()
      resetControl = null
    }
  },
}
onSessionReset(() => {
  radio.stop()
  playlist = new RadioPlaylist(lists)
})
