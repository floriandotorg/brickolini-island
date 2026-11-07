import { parseOriginalHistory, parseOriginalPlayers, parseOriginalSave } from './original-save-import.ts'
import type { PlayerDirectory } from './player-directory.ts'
import { ScoreActors, ScoreMissions } from './score.ts'
import type { ScoreHistory, ScoreHistoryEntry } from './score-history.ts'

type ImportFile = { name: string; arrayBuffer: () => Promise<ArrayBuffer> }
export type OriginalImportResult = { players: string[]; files: number; errors: string[] }
const storageKeys = (storage: Storage): string[] => Array.from({ length: storage.length }, (_, n) => storage.key(n)).filter((key): key is string => key != null)
export const importOriginalFiles = async (files: readonly ImportFile[], storage: Storage, directory: PlayerDirectory, history: ScoreHistory, beforeApply = () => {}): Promise<OriginalImportResult> => {
  const result: OriginalImportResult = { players: [], files: 0, errors: [] }
  const reads = await Promise.allSettled(files.map(async file => ({ name: file.name.toLowerCase(), buffer: await file.arrayBuffer() })))
  const buffers = new Map<string, ArrayBuffer>()
  for (let n = 0; n < reads.length; ++n) {
    const read = reads[n]
    if (read.status === 'fulfilled') {
      if (buffers.has(read.value.name)) {
        result.errors.push(`Duplicate file: ${files[n].name}`)
      } else {
        buffers.set(read.value.name, read.value.buffer)
      }
    } else {
      result.errors.push(`Could not read ${files[n].name}`)
    }
  }
  let roster: string[] | null = null
  let importedHistory: ReturnType<typeof parseOriginalHistory> | null = null
  const parse = <T>(name: string, parser: (buffer: ArrayBuffer) => T): T | null => {
    const buffer = buffers.get(name)
    if (buffer == null) {
      return null
    }
    try {
      const value = parser(buffer)
      ++result.files
      return value
    } catch (error) {
      result.errors.push(`${name}: ${error instanceof Error ? error.message : 'Invalid file'}`)
      return null
    }
  }
  roster = parse('players.gsi', parseOriginalPlayers)
  importedHistory = parse('history.gsi', parseOriginalHistory)
  const profiles = new Map<string, Record<string, string>>()
  let profileFiles = false
  for (const [name, buffer] of buffers) {
    if (name === 'players.gsi' || name === 'history.gsi') {
      continue
    }
    const match = /^g([0-8])\.gs$/.exec(name)
    if (match == null) {
      result.errors.push(`Unsupported save file: ${name}`)
      continue
    }
    profileFiles = true
    const player = roster?.[Number(match[1])]
    if (player == null) {
      result.errors.push(`${name}: Select its Players.gsi file too`)
      continue
    }
    try {
      profiles.set(player, parseOriginalSave(buffer))
      ++result.files
    } catch (error) {
      result.errors.push(`${name}: ${error instanceof Error ? error.message : 'Invalid file'}`)
    }
  }
  const selected = profileFiles ? (roster ?? []).filter(name => profiles.has(name)) : (roster ?? [])
  if (selected.length > 0) {
    beforeApply()
  }
  const backups = new Map<string, Map<string, string>>()
  const restore = (name: string): void => {
    const prefix = `saves.${name}.`
    for (const key of storageKeys(storage)) {
      if (key.startsWith(prefix)) {
        storage.removeItem(key)
      }
    }
    for (const [key, value] of backups.get(name) ?? []) {
      storage.setItem(key, value)
    }
  }
  for (const [name, values] of profiles) {
    const prefix = `saves.${name}.`
    const backup = new Map<string, string>()
    for (const key of storageKeys(storage)) {
      if (key.startsWith(prefix)) {
        const value = storage.getItem(key)
        if (value != null) {
          backup.set(key, value)
        }
      }
    }
    backups.set(name, backup)
    try {
      for (const key of backup.keys()) {
        storage.removeItem(key)
      }
      for (const [key, value] of Object.entries(values)) {
        storage.setItem(`${prefix}${key}`, value)
      }
      result.players.push(name)
    } catch (error) {
      restore(name)
      result.errors.push(`${name}: ${error instanceof Error ? error.message : 'Could not store save'}`)
    }
  }
  if (roster != null) {
    try {
      directory.importNames(profileFiles ? roster.filter(name => result.players.includes(name)) : roster)
      if (!profileFiles) {
        result.players = [...roster]
      }
    } catch (error) {
      for (const name of result.players) {
        restore(name)
      }
      result.players = []
      result.errors.push(error instanceof Error ? error.message : 'Could not store player list')
    }
  }
  const profileEntries: ScoreHistoryEntry[] = result.players.flatMap(name => {
    const values = profiles.get(name)
    if (values == null) {
      return []
    }
    const scores = ScoreMissions.map(mission => ScoreActors.map(actor => Number(values[`score.${mission}.high.${actor}`] ?? 0)))
    return [{ name, playerId: Number(values.playerId), scores, totalScore: scores.flat().reduce((total, value) => total + value, 0) }]
  })
  if (importedHistory != null || profileEntries.length > 0) {
    try {
      history.importEntries([...(importedHistory?.entries ?? []), ...profileEntries], importedHistory?.nextPlayerId ?? 0)
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Could not store score history')
    }
  }
  return result
}
