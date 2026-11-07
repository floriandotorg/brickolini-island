import assert from 'node:assert/strict'
import test from 'node:test'
import { importOriginalFiles } from '../src/lib/original-save-loader.ts'
import { PlayerDirectory } from '../src/lib/player-directory.ts'
import { ScoreHistory } from '../src/lib/score-history.ts'
import { saveFixture, Writer } from './original-save-fixture.ts'

class MemoryStorage implements Storage {
  private readonly _values = new Map<string, string>()
  get length() {
    return this._values.size
  }
  clear = () => this._values.clear()
  getItem = (key: string) => this._values.get(key) ?? null
  key = (index: number) => [...this._values.keys()][index] ?? null
  removeItem = (key: string) => {
    this._values.delete(key)
  }
  setItem = (key: string, value: string) => {
    this._values.set(key, value)
  }
}
const file = (name: string, buffer: ArrayBuffer) => ({ name, arrayBuffer: async () => buffer })
const players = () => {
  const w = new Writer()
  w.u16(1)
  w.name('ZIP')
  return w.buffer()
}

test('original import replaces only validated profiles and merges the roster in original order', async () => {
  const storage = new MemoryStorage()
  const directory = new PlayerDirectory(storage, () => {})
  const history = new ScoreHistory(storage)
  directory.add('OLD')
  storage.setItem('saves.ZIP.vehicle.texture.chwind', 'old decal')
  let prepared = false
  const result = await importOriginalFiles([file('Players.gsi', players()), file('G0.GS', saveFixture())], storage, directory, history, () => {
    prepared = true
  })
  assert.equal(prepared, true)
  assert.deepEqual(result.players, ['ZIP'])
  assert.deepEqual(result.errors, [])
  assert.deepEqual(directory.names, ['ZIP', 'OLD'])
  assert.equal(storage.getItem('saves.ZIP.act'), '2')
  assert.equal(storage.getItem('saves.ZIP.vehicle.texture.chwind'), null)
  assert.equal(history.allocatePlayerId(), 5)
})

test('a malformed profile preserves its existing data and is reported', async () => {
  const storage = new MemoryStorage()
  const directory = new PlayerDirectory(storage, () => {})
  const history = new ScoreHistory(storage)
  storage.setItem('saves.ZIP.act', '3')
  let prepared = false
  const result = await importOriginalFiles([file('Players.gsi', players()), file('G0.GS', new ArrayBuffer(4))], storage, directory, history, () => {
    prepared = true
  })
  assert.equal(result.errors.length, 1)
  assert.equal(storage.getItem('saves.ZIP.act'), '3')
  assert.equal(prepared, false)
})
