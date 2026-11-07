import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PlayerDirectory } from '../src/lib/player-directory.ts'
import { ScoreHistory } from '../src/lib/score-history.ts'

const storage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
  }
}

test('directory persists MRU selection and evicts only the oldest player', () => {
  const store = storage()
  const deleted: string[] = []
  const directory = new PlayerDirectory(store, name => {
    deleted.push(name)
  })
  for (let n = 0; n < 9; ++n) {
    directory.add(`P${n}`)
  }
  directory.select(8)
  directory.add('NEW')
  assert.deepEqual(deleted, ['P1'])
  assert.equal(new PlayerDirectory(store, () => {}).names[1], 'P0')
  assert.equal(directory.names.length, 9)
  directory.add('new')
  assert.equal(directory.names.length, 9)
})

test('corrupt directory storage falls back to an empty list', () => {
  const store = storage()
  store.setItem('saves', '{')
  assert.deepEqual(new PlayerDirectory(store, () => {}).names, [])
})

test('history allocates IDs, keeps stable ties, and replaces the last tied entry', () => {
  const store = storage()
  const history = new ScoreHistory(store)
  const save = (name: string, playerId: number, score = 0) => ({
    name,
    playerId,
    isUnloaded: false,
    getHighScore: () => score,
  })
  assert.equal(history.allocatePlayerId(), 0)
  assert.equal(new ScoreHistory(store).allocatePlayerId(), 1)
  for (let n = 0; n < 20; ++n) {
    history.update(save(`P${n}`, n))
  }
  history.update(save('NEW', 20))
  assert.equal(history.entries.length, 20)
  assert.equal(history.entries[0].name, 'P0')
  assert.equal(history.entries[19].name, 'NEW')
  history.update(save('P2', 2, 3))
  assert.equal(history.entries[0].name, 'P2')
  assert.equal(history.entries[0].totalScore, 75)
  assert.equal(new ScoreHistory(store).entries[0].totalScore, 75)
  history.update({ ...save('', -1), isUnloaded: true })
  assert.equal(history.entries.length, 20)
})

test('save data validates corruption, migrates ambulance scores, and isolates players', async () => {
  const values = new Map<string, string>()
  const store = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, String(value))
      Object.defineProperty(store, key, { configurable: true, enumerable: true, value })
    },
    removeItem: (key: string) => {
      values.delete(key)
      Reflect.deleteProperty(store, key)
    },
  }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: store })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { search: '' } } })
  const { SaveGame } = await import('../src/lib/save-game.ts')
  store.setItem('saves.FIRST.ambulance.high.pepper', '2')
  store.setItem('saves.FIRST.vehicle.placement.bike', '{')
  store.setItem('saves.FIRST.act', 'NaN')
  const first = SaveGame.create('first')
  first.ensurePlayerId()
  assert.equal(first.act, 1)
  assert.equal(first.sunPosition, 2)
  assert.equal(first.getHighScore('ambulance', 'pepper'), 2)
  assert.equal(first.getVehiclePlacement('bike'), null)
  first.recordScore('ambulance', 'pepper', 'red')
  first.recordScore('ambulance', 'pepper', 'yellow')
  assert.equal(first.getScore('ambulance', 'pepper'), 1)
  assert.equal(first.getHighScore('ambulance', 'pepper'), 3)
  first.act = 2
  first.savedPreviousArea = 'act2main'
  first.backgroundColor = { h: 0.2, s: 0.3, v: 0.4 }
  first.setBuildState('helicopter', { introductionCounter: 2, finishedBuild: true, playedExitScript: true })
  first.setVehicleTexture('chwind', 'TEST_Texture')
  const plants = Array.from({ length: 81 }, () => ({ variant: 0, color: 0, sound: 0, move: 0, mood: 0, counter: -1 }) satisfies import('../src/lib/save-game.ts').PlantState)
  first.plants = plants
  const second = SaveGame.create('second')
  second.ensurePlayerId()
  assert.notEqual(second.playerId, first.playerId)
  assert.equal(second.getHighScore('ambulance', 'pepper'), 0)
  assert.equal(second.plants, null)
  assert.equal(second.getVehicleTexture('chwind'), null)
  second.savedPreviousArea = 'hospital'
  assert.equal(second.savedPreviousArea, 'hospital')
  assert.equal(SaveGame.create('second').savedPreviousArea, null)
  const reloaded = SaveGame.create('first')
  assert.equal(reloaded.act, 2)
  assert.equal(reloaded.savedPreviousArea, 'act2main')
  assert.deepEqual(reloaded.backgroundColor, { h: 0.2, s: 0.3, v: 0.4 })
  assert.equal(reloaded.getBuildState('helicopter').finishedBuild, true)
  assert.equal(reloaded.getVehicleTexture('chwind'), 'TEST_Texture')
  assert.deepEqual(reloaded.plants, plants)
  for (let n = 0; n < 10; ++n) {
    reloaded.nextSunPosition()
  }
  assert.equal(reloaded.sunPosition, 5)
  for (let n = 0; n < 10; ++n) {
    reloaded.prevSunPosition()
  }
  assert.equal(reloaded.sunPosition, 0)
  reloaded.act = 1
  assert.equal(SaveGame.create('first').savedPreviousArea, null)
  const historyBeforeDelete = store.getItem('scoreHistory')
  SaveGame.delete('first')
  assert.equal(
    [...values.keys()].some(key => key.startsWith('saves.FIRST.')),
    false,
  )
  assert.equal(store.getItem('scoreHistory'), historyBeforeDelete)
  assert.notEqual(store.getItem('saves.SECOND.playerId'), null)
})
