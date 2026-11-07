import type { PlayerCharacter } from './save-game.ts'

const introductions = { pepper: ['wgs002nu', 'wgs003nu', 'wgs004nu'], mama: ['wgs006nu', 'wgs007nu'], papa: ['wgs012nu', 'wgs014nu'], nick: ['wgs009nu', 'wgs010nu'], laura: ['wgs020nu', 'wgs021nu'] }
export const gasStationVisit = (player: PlayerCharacter, count: number) => ({ introduction: count < introductions[player].length, name: introductions[player][count] ?? (player === 'papa' ? 'wgs017nu' : player === 'laura' ? 'wgs022nu' : 'wgs008nu') })
export const towScore = (elapsed: number): 'red' | 'blue' | 'yellow' => (elapsed < 200_000 ? 'red' : elapsed < 300_000 ? 'blue' : 'yellow')
export const towFinishIndex = (player: PlayerCharacter): number => ['pepper', 'mama', 'nick', 'papa', 'laura'].indexOf(player)
