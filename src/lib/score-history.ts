import type { PlayerCharacter } from './save-game.ts'
import { ScoreActors, type ScoreMission, ScoreMissions } from './score.ts'

export type ScoreHistoryEntry = { name: string; playerId: number; totalScore: number; scores: number[][] }
type HistorySave = { name: string; playerId: number; isUnloaded: boolean; getHighScore: (mission: ScoreMission, player: PlayerCharacter) => number }
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isScoreRow = (value: unknown): value is number[] => Array.isArray(value) && value.length === 5 && value.every(score => Number.isInteger(score) && score >= 0 && score <= 3)
const isEntry = (value: unknown): value is ScoreHistoryEntry =>
  isRecord(value) &&
  typeof value.name === 'string' &&
  typeof value.playerId === 'number' &&
  Number.isInteger(value.playerId) &&
  value.playerId >= 0 &&
  typeof value.totalScore === 'number' &&
  Array.isArray(value.scores) &&
  value.scores.length === 5 &&
  value.scores.every(isScoreRow) &&
  value.totalScore === value.scores.flat().reduce((total, score) => total + score, 0)

export class ScoreHistory {
  private _nextPlayerId = 0
  private _entries: ScoreHistoryEntry[] = []
  private readonly _storage: Pick<Storage, 'getItem' | 'setItem'>

  constructor(storage: Pick<Storage, 'getItem' | 'setItem'>) {
    this._storage = storage
    try {
      const value: unknown = JSON.parse(storage.getItem('scoreHistory') ?? 'null')
      if (isRecord(value) && Array.isArray(value.entries) && value.entries.every(isEntry)) {
        this._entries = value.entries.slice(0, 20).sort((a, b) => b.totalScore - a.totalScore)
        this._nextPlayerId = Math.max(typeof value.nextPlayerId === 'number' && Number.isInteger(value.nextPlayerId) ? value.nextPlayerId : 0, ...this._entries.map(entry => entry.playerId + 1))
      }
    } catch {
      this._entries = []
    }
  }

  public get entries(): readonly ScoreHistoryEntry[] {
    return structuredClone(this._entries)
  }

  public allocatePlayerId = (): number => {
    const playerId = this._nextPlayerId
    ++this._nextPlayerId
    this.store()
    return playerId
  }

  public update = (save: HistorySave): void => {
    if (save.isUnloaded) {
      return
    }
    const scores = ScoreMissions.map(mission => ScoreActors.map(player => save.getHighScore(mission, player)))
    const entry = { name: save.name, playerId: save.playerId, scores, totalScore: scores.flat().reduce((total, score) => total + score, 0) }
    const index = this._entries.findIndex(item => item.name === save.name && item.playerId === save.playerId)
    if (index >= 0) {
      this._entries[index] = entry
    } else if (this._entries.length < 20) {
      this._entries.push(entry)
    } else if (this._entries[19].totalScore <= entry.totalScore) {
      this._entries[19] = entry
    }
    this._entries.sort((a, b) => b.totalScore - a.totalScore)
    this.store()
  }

  public importEntries = (entries: readonly ScoreHistoryEntry[], nextPlayerId: number): void => {
    if (!entries.every(isEntry) || !Number.isSafeInteger(nextPlayerId) || nextPlayerId < 0) {
      throw new Error('Invalid imported score history')
    }
    const merged = structuredClone(this._entries)
    for (const entry of entries) {
      const index = merged.findIndex(existing => existing.name === entry.name && existing.playerId === entry.playerId)
      if (index < 0) {
        merged.push(structuredClone(entry))
      } else {
        merged[index] = structuredClone(entry)
      }
    }
    merged.sort((a, b) => b.totalScore - a.totalScore)
    const next = Math.max(this._nextPlayerId, nextPlayerId, ...entries.map(entry => entry.playerId + 1))
    const selected = merged.slice(0, 20)
    this._storage.setItem('scoreHistory', JSON.stringify({ entries: selected, nextPlayerId: next }))
    this._entries = selected
    this._nextPlayerId = next
  }

  private store = (): void => this._storage.setItem('scoreHistory', JSON.stringify({ nextPlayerId: this._nextPlayerId, entries: this._entries }))
}

let history: ScoreHistory | undefined
export const getScoreHistory = (): ScoreHistory => {
  history ??= new ScoreHistory(localStorage)
  return history
}
