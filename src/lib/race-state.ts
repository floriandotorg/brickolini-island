import { onSessionReset } from './session-state.ts'

export const raceResults = { car: false, jetski: false }
onSessionReset(() => {
  raceResults.car = false
  raceResults.jetski = false
})
