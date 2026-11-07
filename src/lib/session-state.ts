import { act1State } from './act1-state.ts'
import { JukeBoxMusic, jukeBoxState } from './jukebox-state.ts'

export { act1State, jukeBoxState }
export type InfocenterStateValue = 'playCutscene' | 'introCancelled' | 'notRegistered' | 'newState' | 'selectedSave' | 'selectedCharacterAndDestination' | 'exitQueried' | 'welcomeAnimation' | 'exiting' | 'playCredits' | 'exitingToIsland' | 'backToInfoAct1'
export const infocenterState: { state: InfocenterStateValue } = { state: 'newState' }
export const scoreState = { playCubeTutorial: true }
export const act2State = { state: 0, enabled: false }
export const act3State = { state: 0 }
export const helicopterState = { status: 0 }

const resetListeners = new Set<() => void>()
export const onSessionReset = (listener: () => void): void => {
  resetListeners.add(listener)
}

export const resetSession = (): void => {
  scoreState.playCubeTutorial = true
  helicopterState.status = 0
  act1State.value = 'none'
  act2State.state = 0
  act2State.enabled = false
  act3State.state = 0
  infocenterState.state = 'newState'
  jukeBoxState.music = JukeBoxMusic.e_pasquell
  jukeBoxState.active = false
  jukeBoxState.pendingStart = false
  for (const listener of resetListeners) {
    listener()
  }
}
