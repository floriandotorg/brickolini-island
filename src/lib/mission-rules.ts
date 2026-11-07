import type { PlayerCharacter } from './save-game.ts'
import type { ScoreColor } from './score.ts'

export const deliveryScore = (elapsed: number): ScoreColor => (elapsed < 100_000 ? 'red' : elapsed < 200_000 ? 'blue' : 'yellow')
export const hospitalVisit = (count: number) => ({ next: Math.min(count + 1, 5), short: count >= 3, acceptance: count === 0 ? 0 : 1 })
export const isPizzaDestination = (player: PlayerCharacter, type: string, data: number): boolean => {
  switch (player) {
    case 'pepper':
      return type === 'S' && data === 0x12e
    case 'mama':
      return type === 'C' && (data === 0x22 || data === 0x24)
    case 'papa':
      return type === 'C' && data === 0x33
    case 'nick':
      return (type === 'C' && (data === 0x08 || data === 0x09)) || (type === 'W' && data === 0x169)
    case 'laura':
      return type === 'C' && data === 0x0b
  }
}
