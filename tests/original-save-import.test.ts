import assert from 'node:assert/strict'
import test from 'node:test'
import { parseOriginalHistory, parseOriginalPlayers, parseOriginalSave } from '../src/lib/original-save-import.ts'

import { saveFixture, Writer } from './original-save-fixture.ts'

test('original player names preserve slot ordering and reject unsupported letters', () => {
  const w = new Writer()
  w.u16(2)
  w.name('ZIP')
  w.name('ALICE')
  assert.deepEqual(parseOriginalPlayers(w.buffer()), ['ZIP', 'ALICE'])
  const invalid = new Writer()
  invalid.u16(1)
  for (let n = 0; n < 7; ++n) {
    invalid.u16(29)
  }
  assert.throws(() => parseOriginalPlayers(invalid.buffer()), /letter/i)
})

test('original saves convert acts variables customization and state payloads', () => {
  const values = parseOriginalSave(
    saveFixture([
      {
        name: 'PizzeriaState',
        write: w => {
          for (const value of [2, 1, 0, 1, 2]) {
            w.u16(value)
          }
        },
      },
      {
        name: 'LegoCopterBuildState',
        write: w => {
          for (const value of [2, 1, 0, 10]) {
            w.u8(value)
          }
        },
      },
    ]),
  )
  assert.equal(values.act, '2')
  assert.equal(values.player, 'pepper')
  assert.equal(values.playerId, '4')
  assert.equal(values['color.c_dbfrfny4'], 'lego red')
  assert.equal(values['pizzeria.playlist.pepper'], '2')
  assert.equal(values['vehicle.progress.helicopter'], '10')
  assert.equal(JSON.parse(values['build.helicopter']).finishedBuild, true)
  assert.equal(JSON.parse(values.plants).length, 81)
  assert.equal(Object.keys(JSON.parse(values.characters)).length, 66)
  assert.equal(values.savedPreviousArea, 'act2main')
})

test('original import rejects version mismatches unknown states and truncated files', () => {
  const version = saveFixture()
  new DataView(version).setInt32(0, 1, true)
  assert.throws(() => parseOriginalSave(version), /version/i)
  assert.throws(() => parseOriginalSave(saveFixture([{ name: 'UnknownState', write: () => {} }])), /UnknownState/)
  assert.throws(() => parseOriginalSave(saveFixture().slice(0, 12)))
})

test('original history keeps mission and actor score ordering', () => {
  const w = new Writer()
  w.u16(7)
  w.u16(1)
  w.u16(0)
  w.u16(3)
  for (let n = 0; n < 25; ++n) {
    w.u8(n === 0 ? 3 : 0)
  }
  w.name('ZIP')
  w.u16(2)
  const history = parseOriginalHistory(w.buffer())
  assert.equal(history.nextPlayerId, 7)
  assert.equal(history.entries[0].name, 'ZIP')
  assert.deepEqual(history.entries[0].scores[0], [3, 0, 0, 0, 0])
  assert.equal(history.entries[0].totalScore, 3)
})

test('vehicle planes convert handedness and skip their original texture pixels', () => {
  const values = parseOriginalSave(
    saveFixture([
      {
        name: 'Act1State',
        write: w => {
          for (let n = 0; n < 7; ++n) {
            w.text(n === 3 ? 'EDG02_51' : '', 16)
            for (const value of [1, 2, 3, 0, 0, 1, 0, 1, 0]) {
              w.f32(value)
            }
          }
          for (let n = 0; n < 3; ++n) {
            w.text('chwind.gif', 16)
            w.u32(1)
            w.u32(1)
            w.u32(1)
            for (let n = 0; n < 4; ++n) {
              w.u8(0)
            }
          }
          w.u16(2)
          w.u8(1)
        },
      },
    ]),
  )
  assert.deepEqual(JSON.parse(values['vehicle.placement.helicopter']), [-1, 2, 3, 0, 0, 0, 1])
  assert.equal(values.cptClickDialogueIndex, '2')
  assert.equal(values.playedExitExplanation, 'true')
})
