export enum JukeBoxMusic {
  e_pasquell = 0,
  e_right = 1,
  e_decal = 2,
  e_wallis = 3,
  e_nelson = 4,
  e_torpedos = 5,
}

export const JUKEBOX_MUSIC_COUNT = 6

class JukeBoxState {
  public music = JukeBoxMusic.e_pasquell
  public active = false
  public pendingStart = false
}

export const jukeBoxState = new JukeBoxState()
